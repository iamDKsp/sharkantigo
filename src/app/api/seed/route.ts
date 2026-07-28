import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const user = await prisma.perfil.upsert({
      where: { email: "ronigabrieloscar@hotmail.com" },
      update: {},
      create: {
        nome: "Administrador",
        email: "ronigabrieloscar@hotmail.com",
        senha: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Banco de dados inicializado e usuário admin verificado com sucesso!",
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
      credenciais: {
        email: "ronigabrieloscar@hotmail.com",
        senha: "123456",
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao rodar seed:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno no servidor";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
