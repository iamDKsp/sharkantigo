import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "solucoes-financeiras-super-secret-key-2026"
);

export async function POST(request: Request) {
  try {
    const token = request.headers.get("cookie")?.split("; ").find(c => c.startsWith("sol_auth_token="))?.split("=")[1];
    
    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    const userId = verified.payload.sub;

    if (!userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { email, password } = await request.json();

    const updateData: any = {};
    if (email) updateData.email = email;
    if (password) updateData.senha = await bcrypt.hash(password, 10);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum dado para atualizar" }, { status: 400 });
    }

    await prisma.perfil.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
