import { NextResponse } from "next/server";
import { normalizarTelefone } from "@/lib/mensagens/render";

function getWhatsappApiUrl() {
  let url = process.env.WHATSAPP_API_URL || "http://179.127.59.225:3529";
  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  const WHATSAPP_API = getWhatsappApiUrl();
  
  try {
    const body = await req.json();
    // O telefone vai DENTRO de cada item de `messages` (formato esperado pelo
    // serviço de WhatsApp): { messages: [{ phone, text | document, ... }] }.
    if (
      !body ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.length > 5
    ) {
      return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
    }

    const messages = [];
    for (const item of body.messages) {
      const phone = normalizarTelefone(typeof item?.phone === "string" ? item.phone : "");
      if (!phone) {
        return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
      }
      messages.push({ ...item, phone });
    }

    const res = await fetch(`${WHATSAPP_API}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, messages })
    });
    
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Falha de conexão com o servidor do WhatsApp." }, { status: 500 });
  }
}
