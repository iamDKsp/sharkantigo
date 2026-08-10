import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * POST /api/apply-migration
 * Aplica migrações pendentes usando a conexão existente do Prisma.
 * Seguro para rodar múltiplas vezes (idempotente).
 */
export async function POST() {
  try {
    // Adiciona a coluna se ainda não existir (PostgreSQL)
    await prisma.$executeRaw`
      ALTER TABLE emprestimos
      ADD COLUMN IF NOT EXISTS data_prevista_pagamento DATE;
    `;

    return NextResponse.json({
      ok: true,
      message: "Migração aplicada com sucesso (ou já estava aplicada).",
    });
  } catch (err: any) {
    // Se o banco for MySQL/MariaDB, IF NOT EXISTS pode não ser suportado
    // Tenta via verificação manual
    try {
      await prisma.$executeRaw`
        ALTER TABLE \`emprestimos\`
        ADD COLUMN \`data_prevista_pagamento\` DATE NULL;
      `;
      return NextResponse.json({ ok: true, message: "Migração MySQL aplicada." });
    } catch (err2: any) {
      // Erro 1060 = Duplicate column (coluna já existe) — OK!
      const msg = String(err2?.message || "");
      if (
        msg.includes("Duplicate column") ||
        msg.includes("already exists") ||
        msg.includes("1060")
      ) {
        return NextResponse.json({
          ok: true,
          message: "Coluna já existia no banco.",
        });
      }
      return NextResponse.json(
        { ok: false, error: msg, original: String(err?.message) },
        { status: 500 }
      );
    }
  }
}

/**
 * GET /api/apply-migration
 * Verifica o estado da coluna.
 */
export async function GET() {
  try {
    const result = await prisma.$queryRaw<any[]>`
      SELECT data_prevista_pagamento FROM emprestimos LIMIT 1
    `;
    return NextResponse.json({
      ok: true,
      columnExists: true,
      sampleRow: result[0] ?? null,
    });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("data_prevista_pagamento") || msg.includes("Unknown column")) {
      return NextResponse.json({ ok: false, columnExists: false, error: msg });
    }
    // Tabela vazia — coluna existe
    return NextResponse.json({ ok: true, columnExists: true, emptyTable: true });
  }
}
