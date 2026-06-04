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

  // 1. Processar Foto de Perfil
  let fotoUrl: string | null = null;
  const fotoFile = formData.get("foto") as File | null;

  if (fotoFile && fotoFile.size > 0 && fotoFile.name !== "undefined") {
    try {
      const buffer = Buffer.from(await fotoFile.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      
      const ext = path.extname(fotoFile.name) || ".jpg";
      const filename = `${Date.now()}-perfil-${Math.random().toString(36).substring(2, 8)}${ext}`;
      const filepath = path.join(uploadDir, filename);
      await fs.writeFile(filepath, buffer);
      fotoUrl = `/uploads/${filename}`;
    } catch (err) {
      console.error("Erro ao salvar foto de perfil:", err);
    }
  }

  // 2. Processar Documentos
  const docsFiles = formData.getAll("documentos") as File[];
  const documentosUrls: string[] = [];
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  for (const docFile of docsFiles) {
    if (docFile && docFile.size > 0 && docFile.name !== "undefined") {
      try {
        const buffer = Buffer.from(await docFile.arrayBuffer());
        const ext = path.extname(docFile.name) || ".jpg";
        const filename = `${Date.now()}-doc-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, buffer);
        documentosUrls.push(`/uploads/${filename}`);
      } catch (err) {
        console.error("Erro ao salvar documento:", err);
      }
    }
  }

  const documentosUrlsStr = documentosUrls.length > 0 ? JSON.stringify(documentosUrls) : null;

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
