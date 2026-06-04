import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

const prisma = new PrismaClient({ 
  adapter: new PrismaPg(new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  })) 
});

async function main() {
  console.log("Corrigindo parcelas quitadas...");

  const count = await prisma.$executeRaw`
    UPDATE parcelas
    SET valor_pago = valor, data_pagamento = data_vencimento
    WHERE status = 'pago' AND valor_pago IS NULL
  `;

  console.log(`Corrigidas ${count} parcelas no banco de dados!`);
}

main()
  .catch((e) => {
    console.error("Erro durante a correção:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
