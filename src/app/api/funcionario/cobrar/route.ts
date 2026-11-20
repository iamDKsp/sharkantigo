import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigirFuncionarioAtivo } from "@/lib/funcionarioSession";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import { chaveCobranca } from "@/lib/mensagens/catalogo";
import {
  carregarConfiguracoes,
  contextoCobranca,
  enviarPorEvento,
  registrarLog,
  renderizarEvento,
} from "@/lib/mensagens/servidor";

const TIPOS_PARCELADOS = ["parcelado", "parcela_juros_mes"];

/**
 * Funcionário dispara ou registra cobrança de um empréstimo delegado a ele.
 * - modo "sistema": envia pelo WhatsApp conectado do ADM (requer podeDispararWhatsapp = true)
 * - modo "manual": registra no histórico quando o funcionário abre o próprio WhatsApp ou copia a mensagem
 */
export async function POST(req: Request) {
  const auth = await exigirFuncionarioAtivo();
  if (!auth.ok) return NextResponse.json({ ok: false, erro: auth.erro }, { status: auth.status });
  const func = auth.funcionario;

  const { emprestimoId, parcelaId, modo = "sistema" } = await req.json().catch(() => ({}));
  if (typeof emprestimoId !== "string") {
    return NextResponse.json({ ok: false, erro: "Requisição inválida." }, { status: 400 });
  }

  const emp = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });

  if (!emp || emp.funcionario_id !== func.id) {
    return NextResponse.json({ ok: false, erro: "Empréstimo não encontrado." }, { status: 404 });
  }

  const abertas = emp.parcelas.filter((p) => p.status === "aberto");
  if (abertas.length === 0) {
    return NextResponse.json({ ok: false, erro: "Não há parcelas em aberto." }, { status: 400 });
  }

  const p = (typeof parcelaId === "string" && abertas.find((x) => x.id === parcelaId)) || abertas[0];
  const hoje = hojeEmBrasilia();
  const v = new Date(p.data_vencimento);
  const venc = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const tipo = venc < hoje ? "atrasados" : venc.getTime() === hoje.getTime() ? "hoje" : "aVencer";

  const naoRenovacao = emp.parcelas.filter((x) => !x.status.includes("renovacao") && x.status !== "renovado");
  const parcelaUnica = !TIPOS_PARCELADOS.includes(emp.tipo_pagamento) && abertas.length <= 1;
  const cfg = await carregarConfiguracoes();

  const chave = chaveCobranca(tipo, parcelaUnica);
  const contexto = contextoCobranca(
    {
      clienteNome: emp.cliente.nome,
      numero: p.numero,
      valor: Number(p.valor),
      dataVencimento: p.data_vencimento,
      totalParcelas: parcelaUnica ? 1 : naoRenovacao.length || 1,
      valorEmprestado: Number(emp.valor_emprestado),
      taxaJuros: Number(emp.taxa_juros),
      saldoRestante: abertas.reduce((a, x) => a + Number(x.valor), 0),
      parcelaUnica,
    },
    cfg
  );

  if (modo === "manual") {
    const r = await renderizarEvento(chave, contexto, { anexarRodape: true });
    await registrarLog({
      chave,
      telefone: emp.cliente.telefone,
      clienteId: emp.cliente.id,
      parcelaId: p.id,
      texto: r.texto,
      status: "enviado",
    });
    await prisma.cobrancaRelato.create({
      data: {
        emprestimo_id: emp.id,
        funcionario_id: func.id,
        tipo: "whatsapp",
        texto: `Cobrança iniciada pelo WhatsApp próprio (Parcela ${p.numero}).`,
      },
    });
    return NextResponse.json({ ok: true, texto: r.texto, enviadoEm: new Date().toISOString() });
  }

  if (!emp.podeDispararWhatsapp) {
    return NextResponse.json({ ok: false, erro: "Cobrança via WhatsApp do sistema não liberada para este empréstimo." }, { status: 403 });
  }

  const r = await enviarPorEvento(chave, {
    telefone: emp.cliente.telefone,
    clienteId: emp.cliente.id,
    parcelaId: p.id,
    anexarRodape: true,
    contexto,
  });

  if (r.ignorado) {
    return NextResponse.json({ ok: false, erro: "Esta mensagem de cobrança está desativada nas configurações." });
  }

  if (r.enviado) {
    await prisma.cobrancaRelato.create({
      data: {
        emprestimo_id: emp.id,
        funcionario_id: func.id,
        tipo: "whatsapp",
        texto: `Cobrança disparada pelo WhatsApp do sistema (Parcela ${p.numero}).`,
      },
    });
  }

  return NextResponse.json(
    r.enviado
      ? { ok: true, texto: r.texto, enviadoEm: new Date().toISOString() }
      : { ok: false, erro: r.erro || "Falha ao enviar." }
  );
}
