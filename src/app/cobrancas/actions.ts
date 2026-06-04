"use server";

export async function logRemindersSent(parcelasIds: string[]) {
  console.log(`[Disparo de Cobrança] Remetente: Admin. Enviado lembretes para ${parcelasIds.length} parcelas.`);
  return { success: true, count: parcelasIds.length };
}
