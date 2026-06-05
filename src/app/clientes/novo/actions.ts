"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as fs from "fs/promises";
import * as path from "path";

export async function createCliente(formData: FormData) {
  const nome = formData.get("nome") as string;
  const telefone = formData.get("telefone") as string;
  const cidade = formData.get("cidade") as string;
  const documento = formData.get("documento") as string;
  const endereco = formData.get("endereco") as string;
  const referencia = formData.get("referencia") as string;
  const quemIndicou = formData.get("quemIndicou") as string;
  const email = formData.get("email") as string;
  const observacoes = formData.get("observacoes") as string;
  const blacklist = formData.get("blacklist") === "true";

  // 1. Processar Foto de Perfil (Base64)
  const fotoUrl = formData.get("fotoBase64") as string | null;

  // 2. Processar Documentos (Base64)
  const documentosUrlsStr = formData.get("documentosBase64") as string | null;

  await prisma.cliente.create({
    data: {
      nome: nome.trim(),
      telefone: telefone.replace(/\D/g, ""), // Apenas números
      cidade: cidade || "Bauru",
      documento: documento || "",
      endereco: endereco || null,
      referencia: referencia || null,
      quem_indicou: quemIndicou || null,
      email: email || null,
      observacoes: observacoes || null,
      blacklist: blacklist,
      foto_url: fotoUrl,
      documentos_urls: documentosUrlsStr,
    },
  });

  revalidatePath("/clientes");
  return { success: true, redirectUrl: "/clientes" };
}
