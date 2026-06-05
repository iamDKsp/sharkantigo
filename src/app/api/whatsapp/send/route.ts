import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const WHATSAPP_API = process.env.WHATSAPP_API_URL || "http://187.109.128.147:3529";
  
  try {
    const body = await req.json();
    const res = await fetch(`${WHATSAPP_API}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
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
