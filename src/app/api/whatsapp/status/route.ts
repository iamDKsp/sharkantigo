import { NextResponse } from "next/server";

export async function GET() {
  const WHATSAPP_API = process.env.WHATSAPP_API_URL || "http://localhost:3529";
  
  try {
    const res = await fetch(`${WHATSAPP_API}/status`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ status: "disconnected", error: err.message }, { status: 500 });
  }
}
