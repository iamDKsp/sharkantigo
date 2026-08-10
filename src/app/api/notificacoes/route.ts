import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const revalidate = 0;

/** Garante que a coluna data_prevista_pagamento existe no banco. */
async function ensureColumn() {
  try {
    await prisma.$executeRaw`
      ALTER TABLE emprestimos
      ADD COLUMN IF NOT EXISTS data_prevista_pagamento DATE;
    `;
  } catch {
    try {
      await prisma.$executeRaw`
        ALTER TABLE \`emprestimos\`
        ADD COLUMN \`data_prevista_pagamento\` DATE NULL;
      `;
    } catch (e2: any) {
      const msg = String(e2?.message ?? "");
      if (!msg.includes("Duplicate column") && !msg.includes("1060") && !msg.includes("already exists")) {
        throw e2;
      }
    }
  }
}

export async function GET() {
  const hoje = new Date();
  const hojeUTC = new Date(
    Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  );

  let emprestimos: any[] = [];

  try {
    emprestimos = await prisma.emprestimo.findMany({
      where: {
        status: "ativo",
        data_prevista_pagamento: { not: null },
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
      },
    });
  } catch (err: any) {
    const msg = String(err?.message ?? "");
    // Coluna não existe → aplica migration e retorna lista vazia (próxima req já funciona)
    if (
      msg.includes("data_prevista_pagamento") ||
      msg.includes("Unknown column") ||
      msg.includes("does not exist") ||
      msg.includes("column")
    ) {
      try { await ensureColumn(); } catch { /* ignora */ }
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

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
