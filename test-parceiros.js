const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emprestimos = await prisma.emprestimo.findMany({
    select: {
      id: true,
      parceiro_id: true,
      parceiro: {
        select: {
          id: true,
          nome: true
        }
      }
    },
    take: 10
  });
  console.log(JSON.stringify(emprestimos, null, 2));

  const total = await prisma.emprestimo.count();
  const comBruno = await prisma.emprestimo.count({
    where: {
      parceiro: {
        nome: 'Bruno'
      }
    }
  });
  console.log('Total:', total);
  console.log('Com Bruno:', comBruno);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
