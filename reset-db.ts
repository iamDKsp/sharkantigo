import { prisma } from "./src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("ERRO CRÍTICO: Tentativa de executar reset-db em produção bloqueada.");
    process.exit(1);
  }

  console.log("Iniciando limpeza do banco de dados...");

  // Excluir dados legados na ordem correta devido a chaves estrangeiras
  console.log("Excluindo parcelas...");
  await prisma.parcela.deleteMany({});
  
  console.log("Excluindo empréstimos...");
  await prisma.emprestimo.deleteMany({});
  
  console.log("Excluindo clientes...");
  await prisma.cliente.deleteMany({});
  
  console.log("Excluindo cheques...");
  await prisma.cheque.deleteMany({});
  
  console.log("Excluindo parceiros...");
  await prisma.parceiro.deleteMany({});

  console.log("Excluindo perfis antigos...");
  await prisma.perfil.deleteMany({});

  // Criar novo usuário admin
  console.log("Criando usuário admin padrão...");
  const hashedPassword = await bcrypt.hash("123456", 10);
  
  await prisma.perfil.create({
    data: {
      nome: "Roni Gabriel",
      email: "ronigabrieloscar@hotmail.com",
      senha: hashedPassword
    }
  });

  console.log("Reset do banco concluído com sucesso!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Não usar prisma.$disconnect() aqui pois é um client instanciado do mariadb adapter.
    console.log("Pronto!");
    process.exit(0);
  });
