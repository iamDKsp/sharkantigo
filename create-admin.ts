import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // Criar um usuário admin
    const admin = await prisma.perfil.upsert({
      where: { email: "admin@sharkantigo.com" },
      update: {},
      create: {
        nome: "Administrador",
        email: "admin@sharkantigo.com",
        senha: "admin123456", // MUDE ISSO DEPOIS!
      },
    });

    console.log("✅ Usuário criado com sucesso!");
    console.log(`ID: ${admin.id}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Nome: ${admin.nome}`);
    console.log(`Senha temporária: admin123456`);
    console.log("\n⚠️ IMPORTANTE: Mude a senha na primeira vez que entrar!");
  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

