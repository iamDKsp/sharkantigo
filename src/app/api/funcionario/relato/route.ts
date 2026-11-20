import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";
import { revalidatePath } from "next/cache";

const TIPOS_VALIDOS = new Set([
  "whatsapp",
  "ligacao",
  "visita",
  "promessa",
  "sem_resposta",
  "observacao",
]);

function parseDateUTC(s: string): Date | null {
  const clean = s.split("T")[0];
  const [y, m, d] = clean.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export async function POST(req: Request) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status });
  const func = auth.funcionario;

  const body = await req.json().catch(() => ({}));
  const emprestimoId = typeof body.emprestimoId === "string" ? body.emprestimoId : "";
  const tipo = typeof body.tipo === "string" && TIPOS_VALIDOS.has(body.tipo) ? body.tipo : "observacao";
  const texto = typeof body.texto === "string" ? body.texto.trim() : "";
  const dataPrometidaStr = typeof body.dataPrometida === "string" && body.dataPrometida.trim() ? body.dataPrometida.trim() : null;
  const limparDataPrevista = body.limparDataPrevista === true;

  if (!emprestimoId) {
    return NextResponse.json({ ok: false, erro: "Empréstimo inválido." }, { status: 400 });
  }
  if (!texto && !dataPrometidaStr && !limparDataPrevista) {
    return NextResponse.json({ ok: false, erro: "Escreva um relato ou informe uma data prevista." }, { status: 400 });
  }

  const emp = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    select: { id: true, funcionario_id: true },
  });

  if (!emp || emp.funcionario_id !== func.id) {
    return NextResponse.json({ ok: false, erro: "Empréstimo não encontrado." }, { status: 404 });
  }

  const dataPrometidaUTC = dataPrometidaStr ? parseDateUTC(dataPrometidaStr) : null;
  if (dataPrometidaStr && !dataPrometidaUTC) {
    return NextResponse.json({ ok: false, erro: "Data prevista inválida." }, { status: 400 });
  }

  const textoFinal =
    texto ||
    (limparDataPrevista
      ? "Data prevista de pagamento removida."
      : `Promessa de pagamento registrada para ${dataPrometidaStr!.split("-").reverse().join("/")}.`);

  const relato = await prisma.$transaction(async (tx) => {
    const criado = await tx.cobrancaRelato.create({
      data: {
        emprestimo_id: emp.id,
        funcionario_id: func.id,
        tipo: dataPrometidaUTC && tipo === "observacao" ? "promessa" : tipo,
        texto: textoFinal,
        data_prometida: dataPrometidaUTC,
      },
    });

    if (dataPrometidaUTC) {
      await tx.emprestimo.update({
        where: { id: emp.id },
        data: { data_prevista_pagamento: dataPrometidaUTC },
      });
    } else if (limparDataPrevista) {
      await tx.emprestimo.update({
        where: { id: emp.id },
        data: { data_prevista_pagamento: null },
      });
    }

    return criado;
  });

  revalidatePath(`/emprestimos/${emp.id}`);
  revalidatePath(`/configuracoes/funcionarios/${func.id}`);
  revalidatePath("/cobrancas");

  return NextResponse.json({
    ok: true,
    relato: {
      id: relato.id,
      tipo: relato.tipo,
      texto: relato.texto,
      data_prometida: relato.data_prometida ? relato.data_prometida.toISOString().split("T")[0] : null,
      criado_em: relato.criado_em.toISOString(),
    },
  });
}
