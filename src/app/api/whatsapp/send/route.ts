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
    if (
      !body ||
      typeof body.phone !== "string" ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0 ||
      body.messages.length > 5
    ) {
      return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
    }
    const phone = normalizarTelefone(body.phone);
    if (!phone) {
      return NextResponse.json({ error: "Telefone inválido." }, { status: 400 });
    }
    const res = await fetch(`${WHATSAPP_API}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, phone })
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
