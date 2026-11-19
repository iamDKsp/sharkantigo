"use server";

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function criarFuncionario(data: { nome: string; slug: string; senha: string; telefone?: string; fotoUrl?: string }) {
  const hashedPassword = await hash(data.senha, 10);
  
  await prisma.funcionario.create({
    data: {
      nome: data.nome,
      slug: data.slug,
      senha: hashedPassword,
      telefone: data.telefone,
      foto_url: data.fotoUrl,
    },
  });
  
  revalidatePath("/configuracoes/funcionarios");
  return { success: true };
}

export async function listarFuncionarios() {
  return await prisma.funcionario.findMany({
    orderBy: { nome: "asc" },
  });
}
