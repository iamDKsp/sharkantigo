import { prisma } from "./src/lib/db";
async function main() {
  const emps = await prisma.emprestimo.findMany({
    where: {
      cliente: {
        nome: {
          in: ["Francisco Gomes da Silva", "Pablo Richard de sales Ferrari", "Juliane Grandinetti Martins pavanelo", "Erica regina dos Santos sabino", "Daniela Cristina Fernandes"]
        }
      }
    },
    select: {
      id: true,
      cliente: { select: { nome: true } },
      parceiro_id: true,
      parceiro: { select: { nome: true } }
    }
  });
  console.log(JSON.stringify(emps, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
