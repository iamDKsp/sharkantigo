import { prisma } from "@/lib/db";
import ChequesClientView from "@/components/cheques/ChequesClientView";

export const revalidate = 0;

export default async function ChequesPage() {
  const cheques = await prisma.cheque.findMany({
    orderBy: {
      data_compensacao: "asc",
    },
    include: {
      cliente: {
        select: {
          nome: true,
          telefone: true,
        }
      },
      parceiro: {
        select: {
          nome: true,
        }
      }
    }
  });

  const clientes = await prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, telefone: true }
  });

  const parceiros = await prisma.parceiro.findMany({
    orderBy: { nome: "asc" },
    select: { id: true, nome: true }
  });

  // Convert Decimal to string/number for serializability
  const serializedCheques = cheques.map(c => ({
    ...c,
    valor: Number(c.valor),
    taxa_desconto: c.taxa_desconto ? Number(c.taxa_desconto) : null,
    valor_liquido: c.valor_liquido ? Number(c.valor_liquido) : null,
  }));

  return (
    <ChequesClientView 
      cheques={serializedCheques as any} 
      clientes={clientes} 
      parceiros={parceiros} 
    />
  );
}
