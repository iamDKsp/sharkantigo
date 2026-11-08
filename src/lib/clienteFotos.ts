import { prisma } from "@/lib/db";

/**
 * Mapa clienteId → URL da foto, só dos clientes que TÊM foto cadastrada.
 * Não carrega a imagem (que é base64 e pesada): só o tamanho, usado para invalidar o cache
 * do navegador quando a foto muda. A imagem em si vem de /api/clientes/[id]/foto.
 */
export async function fotosDosClientes(): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  try {
    const linhas = await prisma.$queryRaw<{ id: string; v: number }[]>`
      SELECT id, pg_column_size(foto_url) AS v
      FROM clientes
      WHERE foto_url IS NOT NULL AND foto_url <> ''
    `;
    for (const l of linhas) mapa.set(l.id, `/api/clientes/${l.id}/foto?v=${l.v}`);
  } catch (err) {
    console.error("[fotosDosClientes] falha ao consultar fotos:", err);
  }
  return mapa;
}
