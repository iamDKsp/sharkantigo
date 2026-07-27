import { NextResponse } from "next/server";

function getWhatsappApiUrl() {
  let url = process.env.WHATSAPP_API_URL || "http://179.127.59.225:3529";
  url = url.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export async function GET() {
  const WHATSAPP_API = getWhatsappApiUrl();
  
  try {
    const res = await fetch(`${WHATSAPP_API}/status`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ status: "disconnected", error: error.message || "Offline", url: WHATSAPP_API }, { status: 500 });
  }
}
