"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCheque(data: {
  cliente_id: string;
  parceiro_id?: string;
  valor: number;
  taxa_desconto: number;
  valor_liquido: number;
  data_compensacao: string;
  observacoes?: string;
  foto_url?: string;
}) {
  if (!data.cliente_id || !data.valor || !data.data_compensacao) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  await prisma.cheque.create({
    data: {
      cliente_id: data.cliente_id,
      parceiro_id: data.parceiro_id || null,
      valor: data.valor,
      taxa_desconto: data.taxa_desconto,
      valor_liquido: data.valor_liquido,
      data_compensacao: new Date(data.data_compensacao),
      observacoes: data.observacoes || null,
      foto_url: data.foto_url || null,
      status: "em_maos",
    },
  });

  revalidatePath("/cheques");
  revalidatePath(`/clientes/${data.cliente_id}`);
  if (data.parceiro_id) {
    revalidatePath(`/parceiros/${data.parceiro_id}`);
  }
}

export async function updateChequeStatus(id: string, newStatus: string) {
  const cheque = await prisma.cheque.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath("/cheques");
  if (cheque.cliente_id) revalidatePath(`/clientes/${cheque.cliente_id}`);
  if (cheque.parceiro_id) revalidatePath(`/parceiros/${cheque.parceiro_id}`);
}

export async function deleteCheque(id: string) {
  const cheque = await prisma.cheque.delete({
    where: { id },
  });

  revalidatePath("/cheques");
  if (cheque.cliente_id) revalidatePath(`/clientes/${cheque.cliente_id}`);
  if (cheque.parceiro_id) revalidatePath(`/parceiros/${cheque.parceiro_id}`);
}
