"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { montarContexto, renderizarEvento } from "@/lib/mensagens/servidor";
import { lerRegraAtraso } from "@/lib/jurosAtraso";

interface ParcelaInput {
  numero: number;
  valor: number;
  data_vencimento: string;
}

export async function createEmprestimo(formData: FormData) {
  const clienteId = formData.get("clienteId") as string;
  const parceiroId = formData.get("parceiroId") as string || null;
  const valorEmprestado = Number(formData.get("valorEmprestado"));
  const tipoPagamento = formData.get("tipoPagamento") as string;
  const frequencia = formData.get("frequencia") as string;
  const taxaJuros = Number(formData.get("taxaJuros")) || 0;
  const regraAtraso = lerRegraAtraso(formData);
  const taxaMulta = regraAtraso.taxaMulta;
  const dataInicioStr = formData.get("dataInicio") as string;
  const dataVencimentoStr = formData.get("dataVencimento") as string;
  const categoria = formData.get("categoria") as string;
  const observacoes = formData.get("observacoes") as string;
  const parcelasJson = formData.get("parcelasJson") as string;

  if (!clienteId || !valorEmprestado || !dataInicioStr || !dataVencimentoStr) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  // Parse das parcelas
  let parcelas: ParcelaInput[] = [];
  if (parcelasJson) {
    try {
      parcelas = JSON.parse(parcelasJson);
    } catch (err) {
      console.error("Erro ao parsear parcelas do formulário:", err);
    }
  }

  // Se por algum motivo o array de parcelas estiver vazio (ex: à vista), cria ao menos uma
  if (parcelas.length === 0) {
    parcelas = [
      {
        numero: 1,
        valor: valorEmprestado + (tipoPagamento === "a_vista_juros" ? valorEmprestado * (taxaJuros / 100) : 0),
        data_vencimento: dataVencimentoStr,
      },
    ];
  }

  // Criar empréstimo e parcelas associadas em uma transação do Prisma
  let novoEmprestimoId = "";
  let clienteNome = "";
  let clienteTelefone = "";

  await prisma.$transaction(async (tx) => {
    const emprestimo = await tx.emprestimo.create({
      data: {
        cliente_id: clienteId,
        parceiro_id: parceiroId,
        valor_emprestado: valorEmprestado,
        taxa_juros: taxaJuros,
        taxa_multa: taxaMulta,
        data_vencimento: new Date(dataVencimentoStr),
        status: "ativo",
        tipo_pagamento: tipoPagamento,
        frequencia: frequencia,
        data_inicio: new Date(dataInicioStr),
        juros_atraso: taxaMulta,
        atraso_tipo: regraAtraso.tipo,
        atraso_valor: regraAtraso.valor,
        categoria: categoria || "Sem categoria",
        observacoes: observacoes || null,
      },
      include: {
        cliente: true,
      },
    });

    novoEmprestimoId = emprestimo.id;
    clienteNome = emprestimo.cliente.nome;
    clienteTelefone = emprestimo.cliente.telefone;

    // Inserir todas as parcelas
    await tx.parcela.createMany({
      data: parcelas.map((p) => ({
        emprestimo_id: emprestimo.id,
        numero: p.numero,
        valor: p.valor,
        data_vencimento: new Date(p.data_vencimento),
        status: "aberto",
      })),
    });
  });

  revalidatePath("/emprestimos");
  revalidatePath("/clientes");
  if (novoEmprestimoId) {
    revalidatePath(`/emprestimos/${novoEmprestimoId}`);
  }

  // Legenda do PDF (template editável). Falha aqui nunca bloqueia a criação do empréstimo.
  let legendaPdf = "Contratação realizada com sucesso!";
  if (novoEmprestimoId && formData.get("enviarPdfWhatsapp") === "true") {
    try {
      const contexto = await montarContexto({ emprestimoId: novoEmprestimoId });
      const r = await renderizarEvento("emprestimo.contratado", contexto);
      if (r.ativo && r.texto) legendaPdf = r.texto;
    } catch (err) {
      console.error("[mensagens] Falha ao renderizar legenda do novo empréstimo:", (err as Error)?.message);
    }
  }

  return {
    success: true,
    redirectUrl: novoEmprestimoId ? `/emprestimos/${novoEmprestimoId}` : "/emprestimos",
    // Dados retornados ao cliente para envio opcional do PDF via WhatsApp
    clienteNome,
    clienteTelefone,
    legendaPdf,
    parcelas,
    tipoPagamento,
    valorEmprestado,
    taxaJuros,
    taxaMulta,
    atrasoTipo: regraAtraso.tipo,
    atrasoValor: regraAtraso.valor,
    observacoes: observacoes || null,
  };
}
