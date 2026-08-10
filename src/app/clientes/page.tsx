import ClientesListWrapper from "@/components/ClientesListWrapper";

export const revalidate = 0;

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return <ClientesListWrapper initialQuery={params?.q ?? ""} />;
}
