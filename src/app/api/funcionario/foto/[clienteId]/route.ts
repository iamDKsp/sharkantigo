import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ clienteId: string }> }
) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return new NextResponse(null, { status: auth.status });

  const { clienteId } = await ctx.params;

  // Confirma que o cliente possui pelo menos um empréstimo na carteira deste funcionário
  const pertence = await prisma.emprestimo.findFirst({
    where: { cliente_id: clienteId, funcionario_id: auth.funcionario.id },
    select: { id: true },
  });
  if (!pertence) return new NextResponse(null, { status: 404 });

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    select: { foto_url: true },
  });

  const foto = cliente?.foto_url?.trim();
  if (!foto) return new NextResponse(null, { status: 404 });

  if (/^https?:\/\//i.test(foto)) return NextResponse.redirect(foto);

  const m = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(foto);
  if (!m) return new NextResponse(null, { status: 404 });

  const bytes = Buffer.from(m[2], "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
