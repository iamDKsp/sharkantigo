import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

const prisma = new PrismaClient({ 
  adapter: new PrismaPg(new Pool({ connectionString })) 
});

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 10);
  
  await prisma.perfil.upsert({
    where: { email: "ronigabrieloscar@hotmail.com" },
    update: {
      senha: hashedPassword
    },
    create: {
      nome: "Admin Vercel",
      email: "ronigabrieloscar@hotmail.com",
      senha: hashedPassword
    }
  });

  console.log("Usuário admin criado com sucesso!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
