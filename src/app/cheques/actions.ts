"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCheque(formData: FormData) {
  const titular = formData.get("titular") as string;
  const banco = formData.get("banco") as string;
  const valor = Number(formData.get("valor"));
  const dataCompensacaoStr = formData.get("dataCompensacao") as string;
  const status = formData.get("status") as string || "em_maos";

  if (!titular || !banco || !valor || !dataCompensacaoStr) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  await prisma.cheque.create({
    data: {
      titular,
      banco,
      valor,
      data_compensacao: new Date(dataCompensacaoStr),
      status,
    },
  });

  revalidatePath("/cheques");
}

export async function updateChequeStatus(id: string, newStatus: string) {
  await prisma.cheque.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath("/cheques");
}
