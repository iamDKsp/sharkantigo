import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";
import { revalidatePath } from "next/cache";

/**
 * Permite ao funcionário devolver um empréstimo para o ADM exatamente como está,
 * sem alterar parcelas, valores ou status — apenas removendo a delegação
 * e registrando o motivo no histórico de relatos (que notifica o ADM no sino).
 */
export async function POST(req: Request) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status });
  const func = auth.funcionario;

  const body = await req.json().catch(() => ({}));
  const emprestimoId = typeof body.emprestimoId === "string" ? body.emprestimoId : "";
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";

  if (!emprestimoId) {
    return NextResponse.json({ ok: false, erro: "Empréstimo inválido." }, { status: 400 });
  }

  const emp = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    select: { id: true, funcionario_id: true, cliente_id: true },
  });

  if (!emp || emp.funcionario_id !== func.id) {
    return NextResponse.json({ ok: false, erro: "Empréstimo não encontrado na sua carteira." }, { status: 404 });
  }

  const pendente = await prisma.baixaFuncionario.findFirst({
    where: { emprestimo_id: emp.id, funcionario_id: func.id, status: "pendente" },
    select: { id: true },
  });

  if (pendente) {
    return NextResponse.json(
      {
        ok: false,
        erro: "Existe um pagamento pendente de aprovação neste empréstimo. Aguarde o administrador aprovar ou recusar antes de devolver.",
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.emprestimo.update({
      where: { id: emp.id },
      data: {
        funcionario_id: null,
        podeDispararWhatsapp: false,
      },
    });

    await tx.cobrancaRelato.create({
      data: {
        emprestimo_id: emp.id,
        funcionario_id: func.id,
        tipo: "devolucao",
        texto: motivo
          ? `Empréstimo devolvido ao administrador: ${motivo}`
          : "Empréstimo devolvido ao administrador sem alterações.",
      },
    });
  });

  revalidatePath(`/emprestimos/${emp.id}`);
  revalidatePath("/emprestimos");
  revalidatePath("/cobrancas");
  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath(`/configuracoes/funcionarios/${func.id}`);
  revalidatePath(`/${func.slug}/cliente`);

  return NextResponse.json({ ok: true });
}
