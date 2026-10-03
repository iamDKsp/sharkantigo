import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "solucoes-financeiras-super-secret-key-2026"
);

function getAuthToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get("sol_auth_token")?.value ||
    request.headers.get("cookie")?.split("; ").find((c) => c.startsWith("sol_auth_token="))?.split("=")[1]
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.sub as string;
    const tokenEmail = verified.payload.email as string | undefined;

    if (!userId && !tokenEmail) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    let user = userId
      ? await prisma.perfil.findUnique({
          where: { id: userId },
          select: { id: true, nome: true, email: true, criado_em: true },
        })
      : null;

    if (!user && tokenEmail) {
      user = await prisma.perfil.findUnique({
        where: { email: tokenEmail },
        select: { id: true, nome: true, email: true, criado_em: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/perfil error:", error);
    return NextResponse.json({ error: "Erro ao consultar perfil" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    let userId = verified.payload.sub as string;
    const tokenEmail = verified.payload.email as string | undefined;

    let currentUser = userId
      ? await prisma.perfil.findUnique({ where: { id: userId } })
      : null;

    if (!currentUser && tokenEmail) {
      currentUser = await prisma.perfil.findUnique({ where: { email: tokenEmail } });
      if (currentUser) {
        userId = currentUser.id;
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { nome, email, password } = body;

    const updateData: { nome?: string; email?: string; senha?: string } = {};

    if (nome !== undefined) {
      const trimmedNome = String(nome).trim();
      if (!trimmedNome) {
        return NextResponse.json({ error: "O nome não pode ficar em branco." }, { status: 400 });
      }
      updateData.nome = trimmedNome;
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
      }

      // Verifica se outro usuário já usa esse e-mail
      const existing = await prisma.perfil.findFirst({
        where: {
          email: normalizedEmail,
          NOT: { id: userId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Este e-mail já está sendo utilizado em outra conta." },
          { status: 400 }
        );
      }

      updateData.email = normalizedEmail;
    }

    if (password !== undefined && String(password).trim() !== "") {
      const pwd = String(password);
      if (pwd.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter no mínimo 6 caracteres." },
          { status: 400 }
        );
      }
      updateData.senha = await bcrypt.hash(pwd, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum dado fornecido para alteração." }, { status: 400 });
    }

    const updatedUser = await prisma.perfil.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        criado_em: true,
      },
    });

    // Gera um novo JWT com as credenciais atualizadas
    const newToken = await new SignJWT({
      sub: updatedUser.id,
      email: updatedUser.email,
      nome: updatedUser.nome,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      success: true,
      message: "Informações atualizadas com sucesso!",
      user: updatedUser,
    });

    // Atualiza o cookie de sessão com os novos dados
    response.cookies.set({
      name: "sol_auth_token",
      value: newToken,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Erro interno no servidor ao atualizar perfil" }, { status: 500 });
  }
}

export const PUT = POST;
