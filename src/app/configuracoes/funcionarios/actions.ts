"use server";

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { normalizarModoBaixa, slugValido, type ModoBaixaFuncionario } from "@/lib/funcionarioSession";
import { efetivarBaixaFinanceira, type TipoBaixa } from "@/lib/funcionarioBaixa";

export async function criarFuncionario(data: {
  nome: string;
  slug: string;
  senha: string;
  telefone?: string;
  fotoUrl?: string;
  modoBaixa?: ModoBaixaFuncionario;
  ocultarTelefone?: boolean;
  podeVerDocumentos?: boolean;
}) {
  const nome = data.nome?.trim();
  const slug = data.slug?.trim().toLowerCase();
  if (!nome) return { ok: false as const, erro: "Informe o nome." };
  if (!slugValido(slug)) {
    return {
      ok: false as const,
      erro: "Link inválido: use 3 a 40 letras minúsculas, números ou hífen (sem acentos/espaços).",
    };
  }
  if (!data.senha || data.senha.length < 4) {
    return { ok: false as const, erro: "A senha precisa ter ao menos 4 caracteres." };
  }

  const existe = await prisma.funcionario.findUnique({ where: { slug } });
  if (existe) return { ok: false as const, erro: "Já existe um funcionário com esse link." };

  const criado = await prisma.funcionario.create({
    data: {
      nome,
      slug,
      senha: await hash(data.senha, 10),
      telefone: data.telefone?.trim() || null,
      foto_url: data.fotoUrl?.trim() || null,
      modo_baixa: normalizarModoBaixa(data.modoBaixa),
      ocultar_telefone: Boolean(data.ocultarTelefone),
      pode_ver_documentos: Boolean(data.podeVerDocumentos),
    },
    select: { id: true },
  });

  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  return { ok: true as const, id: criado.id };
}

export async function editarFuncionario(
  id: string,
  data: {
    nome: string;
    slug: string;
    novaSenha?: string;
    telefone?: string;
    fotoUrl?: string | null;
    modoBaixa?: ModoBaixaFuncionario;
    ocultarTelefone?: boolean;
    podeVerDocumentos?: boolean;
  }
) {
  const nome = data.nome?.trim();
  const slug = data.slug?.trim().toLowerCase();
  if (!nome) return { ok: false as const, erro: "Informe o nome." };
  if (!slugValido(slug)) {
    return {
      ok: false as const,
      erro: "Link inválido: use 3 a 40 letras minúsculas, números ou hífen (sem acentos/espaços).",
    };
  }
  if (data.novaSenha && data.novaSenha.length < 4) {
    return { ok: false as const, erro: "A nova senha precisa ter ao menos 4 caracteres." };
  }

  const outro = await prisma.funcionario.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  });
  if (outro) return { ok: false as const, erro: "Já existe outro funcionário usando esse link." };

  const updateData: any = {
    nome,
    slug,
    telefone: data.telefone?.trim() || null,
    foto_url: data.fotoUrl === null ? null : data.fotoUrl?.trim() || null,
    modo_baixa: normalizarModoBaixa(data.modoBaixa),
    ocultar_telefone: Boolean(data.ocultarTelefone),
    pode_ver_documentos: Boolean(data.podeVerDocumentos),
  };

  if (data.novaSenha && data.novaSenha.trim()) {
    updateData.senha = await hash(data.novaSenha.trim(), 10);
  }

  await prisma.funcionario.update({ where: { id }, data: updateData });

  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath(`/configuracoes/funcionarios/${id}`);
  revalidatePath(`/${slug}/cliente`);
  return { ok: true as const };
}

export async function excluirFuncionario(id: string) {
  await prisma.funcionario.delete({ where: { id } });
  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath("/cobrancas");
  revalidatePath("/emprestimos");
  return { ok: true as const };
}

export async function listarFuncionarios() {
  return prisma.funcionario.findMany({
    orderBy: { nome: "asc" },
    // Nunca devolver o hash da senha para o navegador
    select: {
      id: true,
      nome: true,
      slug: true,
      telefone: true,
      foto_url: true,
      ativo: true,
      modo_baixa: true,
      ocultar_telefone: true,
      pode_ver_documentos: true,
      _count: { select: { emprestimos: true } },
    },
  });
}

export async function alternarAtivoFuncionario(id: string, ativo: boolean) {
  await prisma.funcionario.update({ where: { id }, data: { ativo } });
  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath(`/configuracoes/funcionarios/${id}`);
}

export async function aprovarBaixaFuncionario(baixaId: string, enviarWhatsapp = false) {
  const baixa = await prisma.baixaFuncionario.findUnique({
    where: { id: baixaId },
    include: {
      emprestimo: { select: { id: true, cliente_id: true } },
    },
  });

  if (!baixa) throw new Error("Solicitação de baixa não encontrada.");
  if (baixa.status !== "pendente") throw new Error("Esta solicitação já foi processada.");

  const res = await efetivarBaixaFinanceira({
    emprestimoId: baixa.emprestimo_id,
    parcelaId: baixa.parcela_id,
    tipo: (baixa.tipo as TipoBaixa) || "parcela",
    cobrarJurosAtraso: baixa.cobrar_atraso,
    enviarWhatsapp,
  });

  await prisma.baixaFuncionario.update({
    where: { id: baixaId },
    data: {
      status: "aprovada",
      valor: res.valorTotal,
      juros_atraso: res.jurosAtraso,
      decidido_em: new Date(),
    },
  });

  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath(`/configuracoes/funcionarios/${baixa.funcionario_id}`);
  revalidatePath(`/emprestimos/${baixa.emprestimo_id}`);
  revalidatePath("/emprestimos");
  revalidatePath("/cobrancas");
  revalidatePath(`/clientes/${baixa.emprestimo.cliente_id}`);
  revalidatePath("/");

  return {
    ok: true as const,
    whatsappEnviado: res.whatsappEnviado,
    whatsappErro: res.whatsappErro,
  };
}

export async function recusarBaixaFuncionario(baixaId: string, motivo: string) {
  const baixa = await prisma.baixaFuncionario.findUnique({
    where: { id: baixaId },
    select: { id: true, status: true, funcionario_id: true, emprestimo_id: true },
  });
  if (!baixa) throw new Error("Solicitação não encontrada.");
  if (baixa.status !== "pendente") throw new Error("Esta solicitação já foi processada.");

  await prisma.baixaFuncionario.update({
    where: { id: baixaId },
    data: {
      status: "recusada",
      motivo_recusa: motivo?.trim() || "Recusada pelo administrador.",
      decidido_em: new Date(),
    },
  });

  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath(`/configuracoes/funcionarios/${baixa.funcionario_id}`);
  revalidatePath(`/emprestimos/${baixa.emprestimo_id}`);
  return { ok: true as const };
}

export async function removerDelegacaoEmprestimo(emprestimoId: string, funcionarioId: string) {
  await prisma.emprestimo.update({
    where: { id: emprestimoId },
    data: { funcionario_id: null, podeDispararWhatsapp: false },
  });
  revalidatePath(`/configuracoes/funcionarios/${funcionarioId}`);
  revalidatePath("/parceiros");
  revalidatePath("/configuracoes/funcionarios");
  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/cobrancas");
  revalidatePath("/emprestimos");
  return { ok: true as const };
}

export async function alternarWhatsappEmprestimo(
  emprestimoId: string,
  podeDispararWhatsapp: boolean,
  funcionarioId: string
) {
  await prisma.emprestimo.update({
    where: { id: emprestimoId },
    data: { podeDispararWhatsapp },
  });
  revalidatePath(`/configuracoes/funcionarios/${funcionarioId}`);
  revalidatePath(`/emprestimos/${emprestimoId}`);
  revalidatePath("/cobrancas");
  return { ok: true as const };
}
