import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Serve a foto de perfil do cliente como imagem de verdade (e não como base64 dentro do HTML/JSON).
 * A foto é guardada em `clientes.foto_url` como data URL ("data:image/jpeg;base64,...").
 * O navegador guarda em cache: a URL recebe `?v=<tamanho>` e muda quando a foto é trocada.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: { foto_url: true },
  });
  const foto = cliente?.foto_url?.trim();
  if (!foto) return new NextResponse(null, { status: 404 });

  // Foto salva como link externo
  if (/^https?:\/\//i.test(foto)) return NextResponse.redirect(foto);

  const m = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(foto);
  if (!m) return new NextResponse(null, { status: 404 });

  const bytes = Buffer.from(m[2], "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
