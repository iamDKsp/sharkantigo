import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { hojeEmBrasilia } from "@/lib/dateUtils";

export const revalidate = 0;

export async function GET() {
  const hojeUTC = hojeEmBrasilia();
  const limite = new Date(hojeUTC);
  limite.setUTCDate(hojeUTC.getUTCDate() + 2); // faltam até 2 dias

  const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [emprestimos, baixasPendentes, relatosRecentes] = await Promise.all([
    prisma.emprestimo
      .findMany({
        where: {
          status: "ativo",
          data_prevista_pagamento: { not: null },
        },
        include: {
          cliente: { select: { id: true, nome: true, telefone: true } },
        },
      })
      .catch(() => []),
    prisma.baixaFuncionario
      .findMany({
        where: { status: "pendente" },
        include: {
          funcionario: { select: { id: true, nome: true } },
          emprestimo: {
            select: {
              id: true,
              cliente: { select: { id: true, nome: true, telefone: true } },
            },
          },
        },
        orderBy: { criado_em: "desc" },
        take: 25,
      })
      .catch(() => []),
    prisma.cobrancaRelato
      .findMany({
        where: {
          funcionario_id: { not: null },
          criado_em: { gte: limite48h },
        },
        include: {
          funcionario: { select: { id: true, nome: true } },
          emprestimo: {
            select: {
              id: true,
              cliente: { select: { id: true, nome: true, telefone: true } },
            },
          },
        },
        orderBy: { criado_em: "desc" },
        take: 20,
      })
      .catch(() => []),
  ]);

  const notifsBaixas = baixasPendentes.map((b) => ({
    id: `baixa:${b.id}`,
    tipo: "baixa_pendente" as const,
    url: `/configuracoes/funcionarios/${b.funcionario.id}`,
    clienteNome: b.emprestimo.cliente.nome,
    clienteId: b.emprestimo.cliente.id,
    clienteTelefone: b.emprestimo.cliente.telefone,
    funcionarioNome: b.funcionario.nome,
    descricao: `${b.funcionario.nome} informou ${b.tipo} (${b.forma_pagamento})`,
    dataPrevista: b.criado_em.toISOString(),
    diasRestantes: -999,
    valorEmprestado: Number(b.valor),
  }));

  const notifsDataPrevista = emprestimos
    .filter((emp) => {
      if (!emp.data_prevista_pagamento) return false;
      const prev = new Date(emp.data_prevista_pagamento);
      const prevUTC = new Date(
        Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate())
      );
      return prevUTC <= limite;
    })
    .map((emp) => {
      const prev = new Date(emp.data_prevista_pagamento!);
      const prevUTC = new Date(
        Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate())
      );
      const diasRestantes = Math.ceil(
        (prevUTC.getTime() - hojeUTC.getTime()) / 86400000
      );
      return {
        id: emp.id,
        tipo: "data_prevista" as const,
        url: `/emprestimos/${emp.id}`,
        clienteNome: emp.cliente.nome,
        clienteId: emp.cliente.id,
        clienteTelefone: emp.cliente.telefone,
        funcionarioNome: null,
        descricao: null,
        dataPrevista: emp.data_prevista_pagamento!.toISOString().split("T")[0],
        diasRestantes,
        valorEmprestado: Number(emp.valor_emprestado),
      };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const notifsRelatos = relatosRecentes.map((r) => ({
    id: `relato:${r.id}`,
    tipo: "relato_funcionario" as const,
    url: `/emprestimos/${r.emprestimo.id}`,
    clienteNome: r.emprestimo.cliente.nome,
    clienteId: r.emprestimo.cliente.id,
    clienteTelefone: r.emprestimo.cliente.telefone,
    funcionarioNome: r.funcionario?.nome || "Funcionário",
    descricao: r.texto,
    dataPrevista: r.criado_em.toISOString(),
    diasRestantes: 999,
    valorEmprestado: 0,
  }));

  return NextResponse.json([...notifsBaixas, ...notifsDataPrevista, ...notifsRelatos]);
}
