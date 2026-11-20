import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clienteId: string }> }
) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status });

  if (!auth.funcionario.pode_ver_documentos) {
    return NextResponse.json(
      { ok: false, erro: "Visualização de documentos não liberada para seu perfil." },
      { status: 403 }
    );
  }

  const { clienteId } = await ctx.params;

  const pertence = await prisma.emprestimo.findFirst({
    where: { cliente_id: clienteId, funcionario_id: auth.funcionario.id },
    select: { id: true },
  });
  if (!pertence) {
    return NextResponse.json({ ok: false, erro: "Cliente não encontrado." }, { status: 404 });
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { documento: true, documentos_urls: true },
  });

  if (!cliente) {
    return NextResponse.json({ ok: false, erro: "Cliente não encontrado." }, { status: 404 });
  }

  let documentos: string[] = [];
  if (cliente.documentos_urls) {
    try {
      const parsed = JSON.parse(cliente.documentos_urls);
      if (Array.isArray(parsed)) documentos = parsed.filter((x) => typeof x === "string");
    } catch {
      // ignora json inválido
    }
  }

  return NextResponse.json({
    ok: true,
    documento: cliente.documento,
    documentos,
  });
}
