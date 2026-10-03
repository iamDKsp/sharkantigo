"use server";

import { prisma } from "@/lib/db";
import {
  carregarRespostasRapidas,
  enviarTextoLivre,
  montarContexto,
  renderizarEvento,
} from "@/lib/mensagens/servidor";

/** Respostas rápidas salvas no banco (única lista para todo o sistema). */
export async function listarRespostasRapidas(): Promise<string[]> {
  return carregarRespostasRapidas();
}

/** Legenda do PDF do cronograma (modelo `cronograma.envio`), já com as variáveis preenchidas. */
export async function legendaCronograma(emprestimoId: string): Promise<string> {
  const padrao = "Segue em anexo o cronograma de parcelas do seu empréstimo.";
  try {
    const contexto = await montarContexto({ emprestimoId });
    const r = await renderizarEvento("cronograma.envio", contexto);
    return r.ativo && r.texto ? r.texto : padrao;
  } catch (err) {
    console.error("[mensagens] legendaCronograma:", (err as Error)?.message);
    return padrao;
  }
}

export interface ResultadoEnvioManual {
  ok: boolean;
  erro?: string;
  /** Texto final enviado (com as variáveis já preenchidas). */
  texto?: string;
}

/**
 * Envia uma mensagem manual (resposta rápida ou texto livre) para um cliente.
 * As variáveis ({nome}, {valor}, {data}…) são preenchidas aqui no servidor com os
 * dados reais do cliente/empréstimo. O telefone vem do banco, não do navegador.
 */
export async function enviarMensagemManual(dados: {
  clienteId: string;
  emprestimoId?: string;
  texto: string;
}): Promise<ResultadoEnvioManual> {
  const texto = (dados.texto || "").trim();
  if (!texto) return { ok: false, erro: "Digite uma mensagem." };
  if (texto.length > 2000) return { ok: false, erro: "Mensagem muito longa (máx. 2000 caracteres)." };

  const cliente = await prisma.cliente.findUnique({ where: { id: dados.clienteId } });
  if (!cliente) return { ok: false, erro: "Cliente não encontrado." };

  const contexto = await montarContexto({ clienteId: cliente.id, emprestimoId: dados.emprestimoId });
  const r = await enviarTextoLivre(texto, {
    telefone: cliente.telefone,
    contexto,
    clienteId: cliente.id,
    chave: "manual",
  });
  return r.enviado ? { ok: true, texto: r.texto } : { ok: false, erro: r.erro || "Falha ao enviar.", texto: r.texto };
}
