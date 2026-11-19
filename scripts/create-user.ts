import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
const isLocal = !connectionString || connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const hashedPassword = await bcrypt.hash("123", 10);

  const user = await prisma.perfil.upsert({
    where: { email: "shark@shark.com" },
    update: {
      senha: hashedPassword,
    },
    create: {
      nome: "Shark",
      email: "shark@shark.com",
      senha: hashedPassword,
    },
  });

  console.log("Usuário criado/atualizado com sucesso:", {
    id: user.id,
    nome: user.nome,
    email: user.email,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
