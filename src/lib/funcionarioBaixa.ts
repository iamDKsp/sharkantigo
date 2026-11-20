import { prisma } from "@/lib/db";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import { calcularJurosAtraso } from "@/lib/jurosAtraso";
import { enviarPorEvento, montarContexto } from "@/lib/mensagens/servidor";
import { formatarBRL, formatarDataUTC } from "@/lib/mensagens/render";

export type TipoBaixa = "parcela" | "renovacao" | "quitacao";
export type FormaPagamento = "pix" | "dinheiro" | "transferencia" | "outro";

export const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string }[] = [
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "transferencia", label: "Transferência" },
  { id: "outro", label: "Outro" },
];

export function normalizarFormaPagamento(v?: string | null): FormaPagamento {
  if (v === "dinheiro" || v === "transferencia" || v === "outro" || v === "pix") return v;
  return "pix";
}

function isParceladoTipo(tipoPagamento: string, qtdAbertas: number) {
  return tipoPagamento === "parcelado" || tipoPagamento === "parcela_juros_mes" || qtdAbertas > 1;
}

/**
 * Calcula no servidor o valor base, juros de atraso e parcela alvo para uma baixa.
 * Nunca confia no valor vindo do navegador.
 */
export async function calcularDetalhesBaixa(params: {
  emprestimoId: string;
  parcelaId?: string | null;
  tipo: TipoBaixa;
  cobrarJurosAtraso: boolean;
}) {
  const hoje = hojeEmBrasilia();
  const emp = await prisma.emprestimo.findUnique({
    where: { id: params.emprestimoId },
    include: {
      cliente: true,
      parcelas: { orderBy: { numero: "asc" } },
    },
  });

  if (!emp) throw new Error("Empréstimo não encontrado.");

  const abertas = emp.parcelas.filter((p) => p.status === "aberto");
  if (abertas.length === 0) {
    throw new Error("Não há parcelas em aberto neste empréstimo.");
  }

  const regra = { tipo: emp.atraso_tipo, valor: emp.atraso_valor };

  if (params.tipo === "renovacao") {
    if (isParceladoTipo(emp.tipo_pagamento, abertas.length)) {
      throw new Error("Empréstimos parcelados não possuem renovação de juros (apenas à vista).");
    }
    const valorJuros = Number((Number(emp.valor_emprestado) * (Number(emp.taxa_juros) / 100)).toFixed(2));
    if (valorJuros <= 0) {
      throw new Error("Este empréstimo não possui taxa de juros configurada para renovação.");
    }
    return {
      emprestimo: emp,
      parcelaAlvo: abertas[0],
      valorBase: valorJuros,
      jurosAtraso: 0,
      valorTotal: valorJuros,
    };
  }

  if (params.tipo === "quitacao") {
    let valorBase = 0;
    let jurosAtraso = 0;
    for (const p of abertas) {
      const v = Number(p.valor);
      valorBase += v;
      if (params.cobrarJurosAtraso) {
        jurosAtraso += calcularJurosAtraso(regra, v, p.data_vencimento, hoje).juros;
      }
    }
    valorBase = Number(valorBase.toFixed(2));
    jurosAtraso = Number(jurosAtraso.toFixed(2));
    return {
      emprestimo: emp,
      parcelaAlvo: abertas[0],
      valorBase,
      jurosAtraso,
      valorTotal: Number((valorBase + jurosAtraso).toFixed(2)),
    };
  }

  // tipo === "parcela"
  const alvo = params.parcelaId
    ? abertas.find((p) => p.id === params.parcelaId)
    : abertas[0];

  if (!alvo) {
    throw new Error("A parcela selecionada não está mais em aberto.");
  }

  const valorBase = Number(alvo.valor);
  const jurosAtraso = params.cobrarJurosAtraso
    ? calcularJurosAtraso(regra, valorBase, alvo.data_vencimento, hoje).juros
    : 0;

  return {
    emprestimo: emp,
    parcelaAlvo: alvo,
    valorBase: Number(valorBase.toFixed(2)),
    jurosAtraso: Number(jurosAtraso.toFixed(2)),
    valorTotal: Number((valorBase + jurosAtraso).toFixed(2)),
  };
}

/**
 * Efetiva a baixa financeira (parcela, renovação ou quitação) no banco.
 * Usado tanto na baixa direta do funcionário quanto na aprovação pelo ADM.
 */
export async function efetivarBaixaFinanceira(params: {
  emprestimoId: string;
  parcelaId?: string | null;
  tipo: TipoBaixa;
  cobrarJurosAtraso: boolean;
  enviarWhatsapp: boolean;
}): Promise<{
  valorTotal: number;
  jurosAtraso: number;
  whatsappEnviado: boolean;
  whatsappErro?: string;
}> {
  const hoje = hojeEmBrasilia();
  const calc = await calcularDetalhesBaixa(params);
  const emp = calc.emprestimo;
  let parcelasRestantes = 0;
  let novoVencimentoRenovacao: Date | null = null;

  await prisma.$transaction(async (tx) => {
    if (params.tipo === "renovacao") {
      const parcelaAtual = calc.parcelaAlvo;
      const valorEmprestado = Number(emp.valor_emprestado);
      const valorJuros = calc.valorBase;

      await tx.parcela.update({
        where: { id: parcelaAtual.id },
        data: {
          valor: valorJuros,
          valor_pago: valorJuros,
          status: "pago_renovacao",
          data_pagamento: hoje,
        },
      });

      let novoVencimento = new Date(parcelaAtual.data_vencimento);
      const cfgBase = await tx.configuracao.findUnique({
        where: { chave: "preservar_dia_base_reprogramacao" },
      });

      if (cfgBase?.valor === "true") {
        let diaBase: number | null = null;
        if (emp.observacoes) {
          const match = emp.observacoes.match(/\[DIA_BASE:\s*(\d+)\]/i);
          if (match) diaBase = parseInt(match[1], 10);
          else {
            const matchCobrador = emp.observacoes.match(/dia\s*0?(\d+)/i);
            if (matchCobrador) diaBase = parseInt(matchCobrador[1], 10);
          }
        }
        if (!diaBase) {
          const primeiraParcela = await tx.parcela.findFirst({
            where: { emprestimo_id: emp.id },
            orderBy: { numero: "asc" },
          });
          if (primeiraParcela) {
            diaBase = new Date(primeiraParcela.data_vencimento).getUTCDate();
          }
        }
        if (diaBase && diaBase >= 1 && diaBase <= 31) {
          const currentYear = parcelaAtual.data_vencimento.getUTCFullYear();
          const currentMonth = parcelaAtual.data_vencimento.getUTCMonth();
          let nextYear = currentYear;
          let nextMonth = currentMonth + 1;
          if (nextMonth > 11) {
            nextMonth = 0;
            nextYear += 1;
          }
          const diasNoMes = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
          novoVencimento = new Date(Date.UTC(nextYear, nextMonth, Math.min(diaBase, diasNoMes)));
        } else {
          novoVencimento.setUTCMonth(novoVencimento.getUTCMonth() + 1);
        }
      } else {
        novoVencimento.setUTCMonth(novoVencimento.getUTCMonth() + 1);
      }

      const ultimaParcela = await tx.parcela.findFirst({
        where: { emprestimo_id: emp.id },
        orderBy: { numero: "desc" },
      });
      const novoNumero = (ultimaParcela?.numero || parcelaAtual.numero) + 1;
      const valorNovaParcela =
        emp.tipo_pagamento === "a_vista" || emp.tipo_pagamento === "a_vista_juros"
          ? Number((valorEmprestado + valorJuros).toFixed(2))
          : Number(parcelaAtual.valor);

      await tx.parcela.create({
        data: {
          emprestimo_id: emp.id,
          numero: novoNumero,
          valor: valorNovaParcela,
          data_vencimento: novoVencimento,
          status: "aberto",
        },
      });

      await tx.emprestimo.update({
        where: { id: emp.id },
        data: { data_vencimento: novoVencimento },
      });

      parcelasRestantes = 1;
      novoVencimentoRenovacao = novoVencimento;
      return;
    }

    if (params.tipo === "quitacao") {
      const abertas = emp.parcelas.filter((p) => p.status === "aberto");
      const regra = { tipo: emp.atraso_tipo, valor: emp.atraso_valor };
      let teveAtraso = false;

      for (const p of abertas) {
        const atraso = params.cobrarJurosAtraso
          ? calcularJurosAtraso(regra, Number(p.valor), p.data_vencimento, hoje)
          : { dias: 0, juros: 0 };
        const venc = new Date(p.data_vencimento);
        const vencUTC = new Date(Date.UTC(venc.getUTCFullYear(), venc.getUTCMonth(), venc.getUTCDate()));
        const atrasada = atraso.juros > 0 || vencUTC < hoje;
        if (atrasada) teveAtraso = true;
        const vPago = Number((Number(p.valor) + atraso.juros).toFixed(2));
        await tx.parcela.update({
          where: { id: p.id },
          data: {
            status: atrasada ? "pago_com_atraso" : "pago",
            data_pagamento: hoje,
            valor_pago: vPago,
          },
        });
      }

      await tx.emprestimo.update({
        where: { id: emp.id },
        data: { status: teveAtraso ? "quitado_com_atraso" : "quitado" },
      });

      parcelasRestantes = 0;
      return;
    }

    // tipo === "parcela"
    const alvo = calc.parcelaAlvo;
    const venc = new Date(alvo.data_vencimento);
    const vencUTC = new Date(Date.UTC(venc.getUTCFullYear(), venc.getUTCMonth(), venc.getUTCDate()));
    const atrasada = calc.jurosAtraso > 0 || vencUTC < hoje;

    await tx.parcela.update({
      where: { id: alvo.id },
      data: {
        status: atrasada ? "pago_com_atraso" : "pago",
        data_pagamento: hoje,
        valor_pago: calc.valorTotal,
      },
    });

    parcelasRestantes = await tx.parcela.count({
      where: { emprestimo_id: emp.id, status: "aberto" },
    });

    if (parcelasRestantes === 0) {
      const temAtrasadas = await tx.parcela.count({
        where: { emprestimo_id: emp.id, status: "pago_com_atraso" },
      });
      await tx.emprestimo.update({
        where: { id: emp.id },
        data: { status: temAtrasadas > 0 ? "quitado_com_atraso" : "quitado" },
      });
    }
  });

  // Disparo opcional de comprovante no WhatsApp (nunca lança erro fatal)
  let whatsappEnviado = false;
  let whatsappErro: string | undefined;

  if (params.enviarWhatsapp && emp.cliente?.telefone) {
    try {
      const chave =
        params.tipo === "renovacao"
          ? "renovacao.confirmada"
          : parcelasRestantes === 0 || params.tipo === "quitacao"
            ? "pagamento.quitacao"
            : "pagamento.parcela";

      const contexto = await montarContexto({
        emprestimoId: emp.id,
        parcelaId: calc.parcelaAlvo.id,
        clienteId: emp.cliente.id,
        extra: {
          valor: formatarBRL(calc.valorTotal),
          ...(novoVencimentoRenovacao ? { novo_vencimento: formatarDataUTC(novoVencimentoRenovacao) } : {}),
        },
      });

      const r = await enviarPorEvento(chave, {
        telefone: emp.cliente.telefone,
        contexto,
        clienteId: emp.cliente.id,
        parcelaId: calc.parcelaAlvo.id,
      });
      whatsappEnviado = r.enviado;
      whatsappErro = r.erro;
    } catch (err: any) {
      whatsappErro = err?.message || "Erro ao enviar comprovante no WhatsApp.";
    }
  }

  return {
    valorTotal: calc.valorTotal,
    jurosAtraso: calc.jurosAtraso,
    whatsappEnviado,
    whatsappErro,
  };
}
