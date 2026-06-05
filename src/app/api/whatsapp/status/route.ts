import { NextResponse } from "next/server";

export async function GET() {
  const WHATSAPP_API = process.env.WHATSAPP_API_URL || "http://187.109.128.147:3529";
  
  try {
    const res = await fetch(`${WHATSAPP_API}/status`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ status: "disconnected", error: error.message || "Offline", url: WHATSAPP_API }, { status: 500 });
  }
}
