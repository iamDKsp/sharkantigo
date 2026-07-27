import { NextResponse } from "next/server";

function getWhatsappApiUrl() {
  let url = process.env.WHATSAPP_API_URL || "http://179.127.59.225:3529";
  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export async function POST() {
  const WHATSAPP_API = getWhatsappApiUrl();
  
  try {
    const res = await fetch(`${WHATSAPP_API}/logout`, { method: 'POST' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Falha ao desconectar do servidor." }, { status: 500 });
  }
}
