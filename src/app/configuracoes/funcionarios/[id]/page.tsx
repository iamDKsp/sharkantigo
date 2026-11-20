import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { hojeEmBrasilia } from "@/lib/dateUtils";
import FuncionarioDetalhesAdmClient from "./FuncionarioDetalhesAdmClient";

export const dynamic = "force-dynamic";

export default async function FuncionarioDetalhesAdmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const func = await prisma.funcionario.findUnique({
    where: { id },
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
      emprestimos: {
        include: {
          cliente: { select: { nome: true } },
          parcelas: { where: { status: "aberto" }, orderBy: { numero: "asc" } },
        },
        orderBy: { data_vencimento: "asc" },
      },
      baixas: {
        include: {
          emprestimo: { select: { cliente: { select: { nome: true } } } },
        },
        orderBy: { criado_em: "desc" },
        take: 200,
      },
      relatos: {
        include: {
          emprestimo: { select: { cliente: { select: { nome: true } } } },
        },
        orderBy: { criado_em: "desc" },
        take: 100,
      },
    },
  });

  if (!func) notFound();

  const hoje = hojeEmBrasilia();
  const diasAtraso = (d: Date) => {
    const v = new Date(d);
    const vu = Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate());
    return Math.floor((hoje.getTime() - vu) / 86_400_000);
  };

  const carteira = func.emprestimos
    .map((e) => {
      const saldoAberto = e.parcelas.reduce((a, p) => a + Number(p.valor), 0);
      const maiorAtraso = e.parcelas.reduce((m, p) => Math.max(m, diasAtraso(p.data_vencimento)), -9999);
      return {
        id: e.id,
        clienteNome: e.cliente.nome,
        status: e.status,
        saldoAberto: Number(saldoAberto.toFixed(2)),
        maiorAtraso,
        podeDispararWhatsapp: e.podeDispararWhatsapp,
        dataPrevista: e.data_prevista_pagamento
          ? e.data_prevista_pagamento.toISOString().split("T")[0]
          : null,
      };
    })
    .sort((a, b) => b.maiorAtraso - a.maiorAtraso);

  const baixas = func.baixas.map((b) => ({
    id: b.id,
    emprestimo_id: b.emprestimo_id,
    clienteNome: b.emprestimo.cliente.nome,
    tipo: b.tipo,
    valor: Number(b.valor),
    juros_atraso: Number(b.juros_atraso),
    forma_pagamento: b.forma_pagamento,
    observacao: b.observacao,
    status: b.status,
    motivo_recusa: b.motivo_recusa,
    criado_em: b.criado_em.toISOString(),
    decidido_em: b.decidido_em ? b.decidido_em.toISOString() : null,
  }));

  const relatos = func.relatos.map((r) => ({
    id: r.id,
    emprestimo_id: r.emprestimo_id,
    clienteNome: r.emprestimo.cliente.nome,
    tipo: r.tipo,
    texto: r.texto,
    data_prometida: r.data_prometida ? r.data_prometida.toISOString().split("T")[0] : null,
    criado_em: r.criado_em.toISOString(),
  }));

  return (
    <FuncionarioDetalhesAdmClient
      funcionario={{
        id: func.id,
        nome: func.nome,
        slug: func.slug,
        telefone: func.telefone,
        foto_url: func.foto_url,
        ativo: func.ativo,
        modo_baixa: func.modo_baixa,
        ocultar_telefone: func.ocultar_telefone,
        pode_ver_documentos: func.pode_ver_documentos,
      }}
      carteira={carteira}
      baixas={baixas}
      relatos={relatos}
    />
  );
}
