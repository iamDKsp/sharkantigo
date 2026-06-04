import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const adapter = new PrismaMariaDb({
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "",
  database: "financas",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando importação de dados (seed)...");

  // Caminhos para os arquivos JSON
  const clientesPath = path.join(process.cwd(), "data", "cliente.json");
  const emprestimosPath = path.join(process.cwd(), "data", "emprestimo.json");

  // Ler arquivos JSON
  const clientesData = JSON.parse(fs.readFileSync(clientesPath, "utf-8"));
  const emprestimosData = JSON.parse(fs.readFileSync(emprestimosPath, "utf-8"));

  console.log(`Carregados ${clientesData.length} clientes e ${emprestimosData.length} empréstimos do JSON.`);

  // 1. Importar clientes
  for (const client of clientesData) {
    await prisma.cliente.upsert({
      where: { id: client.id },
      update: {
        nome: client.nome.trim(),
        telefone: client.telefone,
        cidade: client.cidade || "Bauru",
        documento: client.documento || "",
        foto_url: client.foto_url || null,
      },
      create: {
        id: client.id,
        nome: client.nome.trim(),
        telefone: client.telefone,
        cidade: client.cidade || "Bauru",
        documento: client.documento || "",
        foto_url: client.foto_url || null,
      },
    });
  }
  console.log("Clientes importados/atualizados com sucesso!");

  // 2. Importar empréstimos
  let loanCount = 0;
  for (const loan of emprestimosData) {
    const clientInfo = loan.clientes;

    if (!clientInfo || !clientInfo.id) {
      console.warn(`Empréstimo ${loan.id} não possui informações de cliente válidas. Ignorando.`);
      continue;
    }

    // Garantir que o cliente exista no banco de dados (caso esteja no arquivo de empréstimos mas não no de clientes)
    await prisma.cliente.upsert({
      where: { id: clientInfo.id },
      update: {},
      create: {
        id: clientInfo.id,
        nome: (clientInfo.nome || "Cliente Sem Nome").trim(),
        telefone: clientInfo.telefone || "",
        cidade: "Bauru",
        documento: "",
      },
    });

    // Inserir o empréstimo
    await prisma.emprestimo.upsert({
      where: { id: loan.id },
      update: {
        valor_emprestado: loan.valor_emprestado,
        taxa_juros: loan.taxa_juros,
        taxa_multa: loan.taxa_multa || 0.0,
        data_vencimento: new Date(loan.data_vencimento),
        status: loan.status || "ativo",
        cliente_id: clientInfo.id,
      },
      create: {
        id: loan.id,
        valor_emprestado: loan.valor_emprestado,
        taxa_juros: loan.taxa_juros,
        taxa_multa: loan.taxa_multa || 0.0,
        data_vencimento: new Date(loan.data_vencimento),
        status: loan.status || "ativo",
        cliente_id: clientInfo.id,
      },
    });
    loanCount++;
  }

  console.log(`Total de ${loanCount} empréstimos importados/atualizados com sucesso!`);
}

main()
  .catch((e) => {
    console.error("Erro durante a execução do seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
