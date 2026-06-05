"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as fs from "fs/promises";
import * as path from "path";

export async function updateCliente(formData: FormData) {
  const id = formData.get("id") as string;
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

  // Buscar dados atuais do cliente
  const clienteAtual = await prisma.cliente.findUnique({
    where: { id },
  });

  if (!clienteAtual) {
    throw new Error("Cliente não encontrado");
  }

  // 1. Processar Foto de Perfil
  let fotoUrl = clienteAtual.foto_url;
  const removeFoto = formData.get("removeFoto") === "true";
  const novaFotoBase64 = formData.get("fotoBase64") as string | null;

  if (removeFoto) {
    fotoUrl = null;
  } else if (novaFotoBase64) {
    fotoUrl = novaFotoBase64;
  }

  // 2. Processar Documentos
  // Recebe as URLs dos documentos antigos que o usuário decidiu manter
  const mantidosJson = formData.get("documentosMantidos") as string;
  let documentosFinais: string[] = [];
  try {
    if (mantidosJson) {
      documentosFinais = JSON.parse(mantidosJson);
      if (!Array.isArray(documentosFinais)) documentosFinais = [];
    }
  } catch (err) {
    console.error("Erro ao parsear documentos mantidos:", err);
  }

  // Recebe novos arquivos de documentos (Base64)
  const novosDocsStr = formData.get("documentosBase64") as string | null;
  if (novosDocsStr) {
    try {
      const novosDocs = JSON.parse(novosDocsStr);
      if (Array.isArray(novosDocs)) {
        documentosFinais.push(...novosDocs);
      }
    } catch (err) {
      console.error("Erro ao parsear novos documentos:", err);
    }
  }

  const documentosUrlsStr = documentosFinais.length > 0 ? JSON.stringify(documentosFinais) : null;

  // Atualizar cliente no banco de dados
  await prisma.cliente.update({
    where: { id },
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
  revalidatePath(`/clientes/${id}`);
  return { success: true, redirectUrl: `/clientes/${id}` };
}
