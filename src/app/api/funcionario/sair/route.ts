import { NextResponse } from "next/server";
import { COOKIE_FUNCIONARIO } from "@/lib/funcionarioSession";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_FUNCIONARIO);
  return res;
}
