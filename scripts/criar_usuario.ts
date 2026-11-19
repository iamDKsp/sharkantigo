import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";

async function criarUsuario() {
  const senha = await hash("123456", 10);
  await prisma.perfil.create({
    data: {
      nome: "Admin Local",
      email: "admin@local.com",
      senha: senha,
    },
  });
  console.log("Usuário admin@local.com criado com senha 123456");
}

criarUsuario();
