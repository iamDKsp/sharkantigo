import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { COOKIE_FUNCIONARIO, SESSAO_FUNCIONARIO_SEGUNDOS, criarTokenFuncionario } from "@/lib/funcionarioSession";

export async function POST(req: Request) {
  const { slug, senha } = await req.json().catch(() => ({}));
  if (typeof slug !== "string" || typeof senha !== "string" || !senha) {
    return NextResponse.json({ ok: false, erro: "Informe a senha." }, { status: 400 });
  }

  const f = await prisma.funcionario.findUnique({ where: { slug } });
  // Mesma resposta para "não existe" e "senha errada" (não revela quais slugs existem)
  if (!f || !f.ativo || !(await compare(senha, f.senha))) {
    return NextResponse.json({ ok: false, erro: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_FUNCIONARIO, await criarTokenFuncionario(f.id, f.slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSAO_FUNCIONARIO_SEGUNDOS,
  });
  return res;
}
