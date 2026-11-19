import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lerSessaoFuncionario } from "@/lib/funcionarioSession";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import { chaveCobranca } from "@/lib/mensagens/catalogo";
import { carregarConfiguracoes, contextoCobranca, enviarPorEvento } from "@/lib/mensagens/servidor";

const TIPOS_PARCELADOS = ["parcelado", "parcela_juros_mes"];

/**
 * Funcionário dispara a cobrança pelo WhatsApp do proprietário.
 * Tudo é validado no servidor: sessão, dono do empréstimo e a permissão por empréstimo.
 */
export async function POST(req: Request) {
  const sessao = await lerSessaoFuncionario();
  if (!sessao) return NextResponse.json({ ok: false, erro: "Sessão expirada. Entre novamente." }, { status: 401 });

  const { emprestimoId } = await req.json().catch(() => ({}));
  if (typeof emprestimoId !== "string") {
    return NextResponse.json({ ok: false, erro: "Requisição inválida." }, { status: 400 });
  }

  const func = await prisma.funcionario.findUnique({ where: { id: sessao.fid }, select: { ativo: true } });
  if (!func?.ativo) return NextResponse.json({ ok: false, erro: "Acesso desativado." }, { status: 403 });

  const emp = await prisma.emprestimo.findUnique({
    where: { id: emprestimoId },
    include: { cliente: true, parcelas: { orderBy: { numero: "asc" } } },
  });
  if (!emp || emp.funcionario_id !== sessao.fid) {
    return NextResponse.json({ ok: false, erro: "Empréstimo não encontrado." }, { status: 404 });
  }
  if (!emp.podeDispararWhatsapp) {
    return NextResponse.json({ ok: false, erro: "Cobrança via WhatsApp não liberada para este empréstimo." }, { status: 403 });
  }

  const abertas = emp.parcelas.filter((p) => p.status === "aberto");
  if (abertas.length === 0) {
    return NextResponse.json({ ok: false, erro: "Não há parcelas em aberto." }, { status: 400 });
  }

  const p = abertas[0];
  const hoje = hojeEmBrasilia();
  const v = new Date(p.data_vencimento);
  const venc = new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const tipo = venc < hoje ? "atrasados" : venc.getTime() === hoje.getTime() ? "hoje" : "aVencer";

  const naoRenovacao = emp.parcelas.filter((x) => !x.status.includes("renovacao") && x.status !== "renovado");
  const parcelaUnica = !TIPOS_PARCELADOS.includes(emp.tipo_pagamento) && abertas.length <= 1;
  const cfg = await carregarConfiguracoes();

  const r = await enviarPorEvento(chaveCobranca(tipo, parcelaUnica), {
    telefone: emp.cliente.telefone,
    clienteId: emp.cliente.id,
    parcelaId: p.id,
    anexarRodape: true,
    contexto: contextoCobranca(
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
    ),
  });

  if (r.ignorado) return NextResponse.json({ ok: false, erro: "Esta mensagem de cobrança está desativada nas configurações." });
  return NextResponse.json(r.enviado ? { ok: true } : { ok: false, erro: r.erro || "Falha ao enviar." });
}
