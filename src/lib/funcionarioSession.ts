import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/** Cookie da sessão do funcionário (separado do cookie do ADM: um nunca vale pelo outro). */
export const COOKIE_FUNCIONARIO = "func_session";

const SECRET = new TextEncoder().encode(
  (process.env.JWT_SECRET || "solucoes-financeiras-super-secret-key-2026") + ":funcionario"
);

/** Primeiros segmentos de URL que pertencem ao painel do ADM e nunca podem virar slug. */
export const SLUGS_RESERVADOS = [
  "api", "login", "clientes", "emprestimos", "parceiros", "cobrancas",
  "configuracoes", "cheques", "mensagens", "perfil", "_next",
];

export function slugValido(slug: string) {
  return /^[a-z0-9-]{3,40}$/.test(slug) && !SLUGS_RESERVADOS.includes(slug);
}

export async function criarTokenFuncionario(fid: string, slug: string) {
  return new SignJWT({ tipo: "funcionario", fid, slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(SECRET);
}

export async function lerSessaoFuncionario(): Promise<{ fid: string; slug: string } | null> {
  const token = (await cookies()).get(COOKIE_FUNCIONARIO)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.tipo !== "funcionario") return null;
    return { fid: String(payload.fid), slug: String(payload.slug) };
  } catch {
    return null;
  }
}
