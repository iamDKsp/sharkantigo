import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { lerSessaoFuncionario, normalizarModoBaixa, slugValido } from "@/lib/funcionarioSession";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import { calcularJurosAtraso } from "@/lib/jurosAtraso";
import { chaveCobranca } from "@/lib/mensagens/catalogo";
import {
  carregarConfiguracoes,
  carregarTemplates,
  contextoCobranca,
  parcelasCobradasHoje,
  renderizarComTemplates,
  ultimasCobrancas,
} from "@/lib/mensagens/servidor";
import AcessoLogin from "./AcessoLogin";
import PainelFuncionarioClient from "./PainelFuncionarioClient";
import type {
  BaixaItemFuncionario,
  EmprestimoFuncionarioCard,
  FuncionarioPerfil,
} from "./tipos";

export const dynamic = "force-dynamic";

const TIPOS_PARCELADOS = ["parcelado", "parcela_juros_mes"];
const TIPOS_PARCELA_UNICA = ["a_vista", "a_vista_juros", "juros_compostos"];

export default async function PainelFuncionarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slugValido(slug)) notFound();

  // Só dados públicos (nome/foto) antes do login — a senha nunca sai do servidor.
  const funcionario = await prisma.funcionario.findUnique({
    where: { slug },
    select: {
      id: true,
      nome: true,
      slug: true,
      foto_url: true,
      ativo: true,
      modo_baixa: true,
      ocultar_telefone: true,
      pode_ver_documentos: true,
    },
  });
  if (!funcionario || !funcionario.ativo) notFound();

  const sessao = await lerSessaoFuncionario();
  if (!sessao || sessao.fid !== funcionario.id) {
    return <AcessoLogin slug={slug} nome={funcionario.nome} foto={funcionario.foto_url} />;
  }

  const [emprestimos, templates, cfg, cobradasHoje, baixasDb] = await Promise.all([
    prisma.emprestimo.findMany({
      where: { funcionario_id: funcionario.id },
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            cidade: true,
            endereco: true,
            referencia: true,
            quem_indicou: true,
            documento: true,
            documentos_urls: true,
            foto_url: true,
          },
        },
        parcelas: { orderBy: { numero: "asc" } },
        relatos: {
          orderBy: { criado_em: "desc" },
          take: 20,
        },
      },
      orderBy: { data_vencimento: "asc" },
    }),
    carregarTemplates(),
    carregarConfiguracoes(),
    parcelasCobradasHoje(),
    prisma.baixaFuncionario.findMany({
      where: { funcionario_id: funcionario.id },
      include: {
        emprestimo: {
          select: { cliente: { select: { nome: true } } },
        },
      },
      orderBy: { criado_em: "desc" },
      take: 100,
    }),
  ]);

  const cobradasHojeSet = new Set(cobradasHoje);
  const todasParcelasAbertasIds = emprestimos.flatMap((e) =>
    e.parcelas.filter((p) => p.status === "aberto").map((p) => p.id)
  );
  const mapaUltimas = await ultimasCobrancas(todasParcelasAbertasIds);

  const pendentesPorEmprestimo = new Set(
    baixasDb.filter((b) => b.status === "pendente").map((b) => b.emprestimo_id)
  );

  const hoje = hojeEmBrasilia();
  const inicioMesUTC = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const diasAtrasoCalc = (d: Date) => {
    const v = new Date(d);
    const vu = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
    return Math.floor((hoje.getTime() - vu) / 86_400_000);
  };

  const cards: EmprestimoFuncionarioCard[] = emprestimos.map((emp) => {
    const valorEmp = Number(emp.valor_emprestado);
    const taxaJuros = Number(emp.taxa_juros);
    const regra = { tipo: emp.atraso_tipo, valor: emp.atraso_valor };

    const abertas = emp.parcelas.filter((p) => p.status === "aberto");
    const naoRenovacao = emp.parcelas.filter(
      (p) => !p.status.includes("renovacao") && p.status !== "renovado"
    );
    const isParcelado =
      TIPOS_PARCELADOS.includes(emp.tipo_pagamento) || abertas.length > 1;
    const isAVista =
      !isParcelado &&
      (TIPOS_PARCELA_UNICA.includes(emp.tipo_pagamento) || naoRenovacao.length <= 1);
    const totalParcelasExibicao = isAVista ? 1 : naoRenovacao.length || 1;
    const valorJurosRenovacao = Number((valorEmp * (taxaJuros / 100)).toFixed(2));
    const podeRenovar = isAVista && valorJurosRenovacao > 0 && abertas.length > 0 && emp.status === "ativo";
    const saldoAberto = abertas.reduce((acc, p) => acc + Number(p.valor), 0);
    const totalPago = emp.parcelas
      .filter((p) => p.status.startsWith("pago"))
      .reduce((acc, p) => acc + Number(p.valor_pago ?? p.valor), 0);

    let totalJurosAtraso = 0;

    const parcelasSer = emp.parcelas.map((p) => {
      const valor = Number(p.valor);
      const dias = p.status === "aberto" ? diasAtrasoCalc(p.data_vencimento) : 0;
      const atraso =
        p.status === "aberto"
          ? calcularJurosAtraso(regra, valor, p.data_vencimento, hoje)
          : { dias: 0, juros: 0 };
      totalJurosAtraso += atraso.juros;

      let mensagem: string | null = null;
      if (p.status === "aberto") {
        const tipoCob = dias > 0 ? "atrasados" : dias === 0 ? "hoje" : "aVencer";
        mensagem = renderizarComTemplates(
          chaveCobranca(tipoCob, isAVista),
          contextoCobranca(
            {
              clienteNome: emp.cliente.nome,
              numero: p.numero,
              valor,
              dataVencimento: p.data_vencimento,
              totalParcelas: totalParcelasExibicao,
              valorEmprestado: valorEmp,
              taxaJuros,
              saldoRestante: saldoAberto,
              parcelaUnica: isAVista,
            },
            cfg
          ),
          templates,
          { anexarRodape: true }
        ).texto;
      }

      const ultima = mapaUltimas.get(p.id);
      return {
        id: p.id,
        numero: p.numero,
        valor,
        valor_pago: p.valor_pago ? Number(p.valor_pago) : null,
        data_vencimento: p.data_vencimento.toISOString(),
        data_pagamento: p.data_pagamento ? p.data_pagamento.toISOString() : null,
        status: p.status,
        diasAtraso: dias,
        jurosAtraso: atraso.juros,
        cobradaHoje: cobradasHojeSet.has(p.id),
        ultimaCobranca: ultima ?? null,
        mensagem,
      };
    });

    const abertasSer = parcelasSer.filter((p) => p.status === "aberto");
    const primeiraAberta = abertasSer[0] ?? null;
    const maiorAtraso =
      abertasSer.length > 0
        ? abertasSer.reduce((m, p) => Math.max(m, p.diasAtraso), -9999)
        : -9999;

    const cobradoHoje = abertasSer.some((p) => p.cobradaHoje);
    const ultimaCobranca = abertasSer.reduce<string | null>((latest, p) => {
      if (!p.ultimaCobranca) return latest;
      if (!latest) return p.ultimaCobranca;
      return new Date(p.ultimaCobranca).getTime() > new Date(latest).getTime()
        ? p.ultimaCobranca
        : latest;
    }, null);

    let temDocumentos = false;
    if (funcionario.pode_ver_documentos && emp.cliente.documentos_urls) {
      try {
        const arr = JSON.parse(emp.cliente.documentos_urls);
        temDocumentos = Array.isArray(arr) && arr.length > 0;
      } catch {
        temDocumentos = false;
      }
    }

    return {
      id: emp.id,
      status: emp.status,
      tipo_pagamento: emp.tipo_pagamento,
      frequencia: emp.frequencia,
      valor_emprestado: valorEmp,
      taxa_juros: taxaJuros,
      atraso_tipo: emp.atraso_tipo,
      atraso_valor: emp.atraso_valor,
      observacoes: emp.observacoes,
      data_prevista_pagamento: emp.data_prevista_pagamento
        ? emp.data_prevista_pagamento.toISOString().split("T")[0]
        : null,
      podeDispararWhatsapp: emp.podeDispararWhatsapp,
      isAVista,
      podeRenovar,
      valorJurosRenovacao,
      saldoAberto: Number(saldoAberto.toFixed(2)),
      totalJurosAtraso: Number(totalJurosAtraso.toFixed(2)),
      totalPago: Number(totalPago.toFixed(2)),
      maiorAtraso,
      proximoVencimento: primeiraAberta ? primeiraAberta.data_vencimento : null,
      cobradoHoje,
      ultimaCobranca,
      mensagemPadrao: primeiraAberta?.mensagem || "",
      temBaixaPendente: pendentesPorEmprestimo.has(emp.id),
      cliente: {
        id: emp.cliente.id,
        nome: emp.cliente.nome,
        telefone: funcionario.ocultar_telefone ? null : emp.cliente.telefone,
        cidade: emp.cliente.cidade,
        endereco: emp.cliente.endereco,
        referencia: emp.cliente.referencia,
        quem_indicou: emp.cliente.quem_indicou,
        documento: funcionario.pode_ver_documentos ? emp.cliente.documento : null,
        temDocumentos,
        foto_src: emp.cliente.foto_url
          ? `/api/funcionario/foto/${emp.cliente.id}?v=${emp.cliente.foto_url.length}`
          : null,
      },
      parcelas: parcelasSer,
      relatos: emp.relatos.map((r) => ({
        id: r.id,
        emprestimo_id: r.emprestimo_id,
        tipo: r.tipo,
        texto: r.texto,
        data_prometida: r.data_prometida
          ? r.data_prometida.toISOString().split("T")[0]
          : null,
        criado_em: r.criado_em.toISOString(),
      })),
    };
  });

  // Ordenar: atrasados primeiro (mais atrasado no topo), depois vence hoje, depois a vencer
  cards.sort((a, b) => b.maiorAtraso - a.maiorAtraso);

  const baixasSer: BaixaItemFuncionario[] = baixasDb.map((b) => ({
    id: b.id,
    emprestimo_id: b.emprestimo_id,
    clienteNome: b.emprestimo.cliente.nome,
    parcela_id: b.parcela_id,
    tipo: b.tipo,
    valor: Number(b.valor),
    juros_atraso: Number(b.juros_atraso),
    forma_pagamento: b.forma_pagamento,
    observacao: b.observacao,
    status: b.status,
    motivo_recusa: b.motivo_recusa,
    criado_em: b.criado_em.toISOString(),
    decidido_em: b.decidido_em ? b.decidido_em.toISOString() : null,
  }));

  const recebidoMes = baixasSer
    .filter(
      (b) =>
        (b.status === "direta" || b.status === "aprovada") &&
        new Date(b.criado_em) >= inicioMesUTC
    )
    .reduce((acc, b) => acc + b.valor, 0);

  const perfil: FuncionarioPerfil = {
    id: funcionario.id,
    nome: funcionario.nome,
    slug: funcionario.slug,
    foto_url: funcionario.foto_url,
    modo_baixa: normalizarModoBaixa(funcionario.modo_baixa),
    ocultar_telefone: funcionario.ocultar_telefone,
    pode_ver_documentos: funcionario.pode_ver_documentos,
  };

  return (
    <PainelFuncionarioClient
      funcionario={perfil}
      emprestimos={cards}
      baixas={baixasSer}
      recebidoMes={Number(recebidoMes.toFixed(2))}
    />
  );
}
