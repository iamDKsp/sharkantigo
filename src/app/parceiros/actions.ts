"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createParceiro(formData: FormData) {
  const nome = formData.get("nome") as string;
  const telefone = formData.get("telefone") as string;

  if (!nome) {
    throw new Error("Nome é obrigatório.");
  }

  await prisma.parceiro.create({
    data: {
      nome,
      telefone: telefone || null,
    },
  });

  revalidatePath("/parceiros");
  revalidatePath("/emprestimos/novo");
}

export async function updateParceiro(id: string, formData: FormData) {
  const nome = formData.get("nome") as string;
  const telefone = formData.get("telefone") as string;

  if (!nome) {
    throw new Error("Nome é obrigatório.");
  }

  await prisma.parceiro.update({
    where: { id },
    data: {
      nome,
      telefone: telefone || null,
    },
  });

  revalidatePath("/parceiros");
  revalidatePath("/emprestimos/novo");
}

export async function deleteParceiro(id: string) {
  await prisma.parceiro.delete({
    where: { id },
  });

  revalidatePath("/parceiros");
  revalidatePath("/emprestimos/novo");
}
