import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";
import {
  calcularDetalhesBaixa,
  efetivarBaixaFinanceira,
  normalizarFormaPagamento,
  type TipoBaixa,
} from "@/lib/funcionarioBaixa";
import { revalidatePath } from "next/cache";

const TIPOS_BAIXA: TipoBaixa[] = ["parcela", "renovacao", "quitacao"];

export async function POST(req: Request) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status });
  const func = auth.funcionario;

  if (func.modo_baixa === "nenhum") {
    return NextResponse.json(
      { ok: false, erro: "Seu perfil não tem permissão para registrar pagamentos." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const emprestimoId = typeof body.emprestimoId === "string" ? body.emprestimoId : "";
  const parcelaId = typeof body.parcelaId === "string" ? body.parcelaId : null;
  const tipo: TipoBaixa = TIPOS_BAIXA.includes(body.tipo) ? body.tipo : "parcela";
  const cobrarJurosAtraso = body.cobrarJurosAtraso !== false;
  const formaPagamento = normalizarFormaPagamento(body.formaPagamento);
  const observacao = typeof body.observacao === "string" ? body.observacao.trim() : "";
  const enviarWhatsapp = body.enviarWhatsapp === true;

  if (!emprestimoId) {
    return NextResponse.json({ ok: false, erro: "Empréstimo inválido." }, { status: 400 });
  }

  const emp = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    select: { id: true, funcionario_id: true, podeDispararWhatsapp: true, cliente_id: true },
  });

  if (!emp || emp.funcionario_id !== func.id) {
    return NextResponse.json({ ok: false, erro: "Empréstimo não encontrado." }, { status: 404 });
  }

  try {
    const calc = await calcularDetalhesBaixa({
      emprestimoId: emp.id,
      parcelaId,
      tipo,
      cobrarJurosAtraso,
    });

    if (func.modo_baixa === "aprovacao") {
      // Evita duplicidade de solicitação pendente para o mesmo empréstimo/parcela
      const jaPendente = await prisma.baixaFuncionario.findFirst({
        where: {
          emprestimo_id: emp.id,
          status: "pendente",
          ...(tipo === "parcela" ? { parcela_id: calc.parcelaAlvo.id } : {}),
        },
        select: { id: true },
      });

      if (jaPendente) {
        return NextResponse.json(
          { ok: false, erro: "Já existe uma solicitação de baixa pendente de aprovação para este pagamento." },
          { status: 409 }
        );
      }

      const criada = await prisma.baixaFuncionario.create({
        data: {
          funcionario_id: func.id,
          emprestimo_id: emp.id,
          parcela_id: calc.parcelaAlvo.id,
          tipo,
          valor: calc.valorTotal,
          juros_atraso: calc.jurosAtraso,
          cobrar_atraso: cobrarJurosAtraso,
          forma_pagamento: formaPagamento,
          observacao: observacao || null,
          status: "pendente",
        },
      });

      revalidatePath(`/emprestimos/${emp.id}`);
      revalidatePath(`/configuracoes/funcionarios/${func.id}`);
      revalidatePath("/configuracoes/funcionarios");

      return NextResponse.json({
        ok: true,
        status: "pendente",
        baixaId: criada.id,
        valor: calc.valorTotal,
      });
    }

    // modo_baixa === "direto"
    const res = await efetivarBaixaFinanceira({
      emprestimoId: emp.id,
      parcelaId: calc.parcelaAlvo.id,
      tipo,
      cobrarJurosAtraso,
      enviarWhatsapp: enviarWhatsapp && emp.podeDispararWhatsapp,
    });

    const criada = await prisma.baixaFuncionario.create({
      data: {
        funcionario_id: func.id,
        emprestimo_id: emp.id,
        parcela_id: calc.parcelaAlvo.id,
        tipo,
        valor: res.valorTotal,
        juros_atraso: res.jurosAtraso,
        cobrar_atraso: cobrarJurosAtraso,
        forma_pagamento: formaPagamento,
        observacao: observacao || null,
        status: "direta",
        decidido_em: new Date(),
      },
    });

    revalidatePath(`/emprestimos/${emp.id}`);
    revalidatePath("/emprestimos");
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${emp.cliente_id}`);
    revalidatePath("/cobrancas");
    revalidatePath("/");
    revalidatePath(`/configuracoes/funcionarios/${func.id}`);
    revalidatePath("/configuracoes/funcionarios");

    return NextResponse.json({
      ok: true,
      status: "direta",
      baixaId: criada.id,
      valor: res.valorTotal,
      whatsappEnviado: res.whatsappEnviado,
      whatsappErro: res.whatsappErro,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, erro: err?.message || "Erro ao registrar pagamento." }, { status: 400 });
  }
}
