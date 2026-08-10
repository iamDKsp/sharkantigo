import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  const hoje = new Date();
  const hojeUTC = new Date(
    Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  );

  // Busca empréstimos ativos com data_prevista_pagamento definida
  const emprestimos = await prisma.emprestimo.findMany({
    where: {
      status: "ativo",
      data_prevista_pagamento: { not: null },
    },
    include: {
      cliente: { select: { id: true, nome: true, telefone: true } },
    },
  });

  const limite = new Date(hojeUTC);
  limite.setUTCDate(hojeUTC.getUTCDate() + 2); // faltam até 2 dias

  const notificacoes = emprestimos
    .filter((emp) => {
      if (!emp.data_prevista_pagamento) return false;
      const prev = new Date(emp.data_prevista_pagamento);
      const prevUTC = new Date(
        Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate())
      );
      // Aparece quando falta <= 2 dias OU já passou (sem ter sido quitado)
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
        clienteNome: emp.cliente.nome,
        clienteId: emp.cliente.id,
        clienteTelefone: emp.cliente.telefone,
        dataPrevista: emp.data_prevista_pagamento!.toISOString().split("T")[0],
        diasRestantes,
        valorEmprestado: Number(emp.valor_emprestado),
      };
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  return NextResponse.json(notificacoes);
}
