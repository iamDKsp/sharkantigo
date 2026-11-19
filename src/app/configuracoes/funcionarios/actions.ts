"use server";

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { slugValido } from "@/lib/funcionarioSession";

export async function criarFuncionario(data: { nome: string; slug: string; senha: string; telefone?: string; fotoUrl?: string }) {
  const nome = data.nome?.trim();
  const slug = data.slug?.trim().toLowerCase();
  if (!nome) return { ok: false as const, erro: "Informe o nome." };
  if (!slugValido(slug)) return { ok: false as const, erro: "Link inválido: use 3 a 40 letras minúsculas, números ou hífen (sem acentos/espaços)." };
  if (!data.senha || data.senha.length < 4) return { ok: false as const, erro: "A senha precisa ter ao menos 4 caracteres." };

  const existe = await prisma.funcionario.findUnique({ where: { slug } });
  if (existe) return { ok: false as const, erro: "Já existe um funcionário com esse link." };

  await prisma.funcionario.create({
    data: {
      nome,
      slug,
      senha: await hash(data.senha, 10),
      telefone: data.telefone?.trim() || null,
      foto_url: data.fotoUrl?.trim() || null,
    },
  });

  revalidatePath("/configuracoes/funcionarios");
  return { ok: true as const };
}

export async function listarFuncionarios() {
  return prisma.funcionario.findMany({
    orderBy: { nome: "asc" },
    // Nunca devolver o hash da senha para o navegador
    select: { id: true, nome: true, slug: true, telefone: true, foto_url: true, ativo: true, _count: { select: { emprestimos: true } } },
  });
}

export async function alternarAtivoFuncionario(id: string, ativo: boolean) {
  await prisma.funcionario.update({ where: { id }, data: { ativo } });
  revalidatePath("/configuracoes/funcionarios");
}
