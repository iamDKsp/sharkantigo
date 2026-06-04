import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

const prisma = new PrismaClient({ 
  adapter: new PrismaPg(new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  })) 
});

async function main() {
  console.log("Iniciando importação de dados para o banco online...");

  // Caminhos para os arquivos JSON
  const clientesPath = path.join(process.cwd(), "clientes.json");
  const emprestimosPath = path.join(process.cwd(), "emprestimos.json");

  // Ler arquivos JSON
  let clientesData = [];
  let emprestimosData = [];

  try {
    clientesData = JSON.parse(fs.readFileSync(clientesPath, "utf-8"));
    console.log(`Lidos ${clientesData.length} clientes do JSON.`);
  } catch (e) {
    console.log("Arquivo clientes.json não encontrado ou vazio.");
  }

  try {
    emprestimosData = JSON.parse(fs.readFileSync(emprestimosPath, "utf-8"));
    console.log(`Lidos ${emprestimosData.length} empréstimos do JSON.`);
  } catch (e) {
    console.log("Arquivo emprestimos.json não encontrado ou vazio.");
  }

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
  console.log("Clientes importados com sucesso!");

  // 2. Importar empréstimos
  let loanCount = 0;
  for (const loan of emprestimosData) {
    const clientInfo = loan.clientes;

    if (!clientInfo || !clientInfo.id) {
      console.warn(`Empréstimo ${loan.id} não possui informações de cliente válidas. Ignorando.`);
      continue;
    }

    // Garantir que o cliente exista no banco de dados
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
    
    // Inserir parcela única correspondente
    // Como a migration de JSON antigo pressupõe 1 parcela que vence na mesma data
    const valorParcela = Number(loan.valor_emprestado) + (Number(loan.valor_emprestado) * (Number(loan.taxa_juros)/100));
    
    // Verificar se já existe parcela
    const existeParcela = await prisma.parcela.findFirst({
      where: { emprestimo_id: loan.id }
    });
    
    if (!existeParcela) {
       await prisma.parcela.create({
          data: {
             emprestimo_id: loan.id,
             numero: 1,
             valor: valorParcela,
             data_vencimento: new Date(loan.data_vencimento),
             status: loan.status === "ativo" ? "aberto" : "pago",
          }
       });
    }
    
    loanCount++;
  }

  console.log(`Total de ${loanCount} empréstimos (e parcelas) importados/atualizados com sucesso!`);
}

main()
  .catch((e) => {
    console.error("Erro durante a importação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
