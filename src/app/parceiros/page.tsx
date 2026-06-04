import { prisma } from "@/lib/db";
import ClientParceirosList from "./ClientParceirosList";

export const revalidate = 0;

export default async function ParceirosPage() {
  const parceiros = await prisma.parceiro.findMany({
    orderBy: {
      nome: "asc",
    },
  });

  return <ClientParceirosList parceiros={parceiros} />;
}
