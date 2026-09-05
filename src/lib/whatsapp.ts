export function getWhatsappApiUrl(): string {
  let url = process.env.WHATSAPP_API_URL || "http://179.127.59.225:3529";
  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export async function sendWhatsappMessage(
  phone: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!phone || !text) {
    return { success: false, error: "Telefone ou texto inválido." };
  }

  const WHATSAPP_API = getWhatsappApiUrl();

  try {
    const res = await fetch(`${WHATSAPP_API}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ phone, text }],
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || `Status HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Erro ao enviar mensagem WhatsApp:", err?.message || err);
    return {
      success: false,
      error: err?.message || "Falha de conexão com o servidor do WhatsApp.",
    };
  }
}
