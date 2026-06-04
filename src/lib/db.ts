import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  // Na Vercel/Produção, se a URL for Postgres, instanciamos o Prisma Client padrão.
  // Caso contrário, mantemos MariaDB para testes remotos de homologação.
  const isPostgres = process.env.DATABASE_URL?.startsWith("postgres") || process.env.DATABASE_URL?.startsWith("postgresql");
  if (isPostgres) {
    prisma = new PrismaClient();
  } else {
    const adapter = new PrismaMariaDb({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3307,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "financas",
      connectionLimit: 10,
    });
    prisma = new PrismaClient({ adapter });
  }
} else {
  // Em desenvolvimento, evitamos conexões duplicadas usando a variável global
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    const adapter = new PrismaMariaDb({
      host: "127.0.0.1",
      port: 3307,
      user: "root",
      password: "",
      database: "financas",
      connectionLimit: 10,
    });
    globalWithPrisma.prisma = new PrismaClient({ adapter });
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
