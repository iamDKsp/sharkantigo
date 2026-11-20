import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/** Cookie da sessão do funcionário (separado do cookie do ADM: um nunca vale pelo outro). */
export const COOKIE_FUNCIONARIO = "func_session";
export const SESSAO_FUNCIONARIO_SEGUNDOS = 60 * 60 * 24 * 7; // 7 dias

export type ModoBaixaFuncionario = "nenhum" | "aprovacao" | "direto";

const SECRET = new TextEncoder().encode(
  (process.env.JWT_SECRET || "solucoes-financeiras-super-secret-key-2026") + ":funcionario"
);

/** Primeiros segmentos de URL que pertencem ao painel do ADM e nunca podem virar slug. */
export const SLUGS_RESERVADOS = [
  "api", "login", "clientes", "emprestimos", "parceiros", "cobrancas",
  "configuracoes", "cheques", "mensagens", "perfil", "_next", "favicon.ico",
];

export function slugValido(slug: string) {
  return /^[a-z0-9-]{3,40}$/.test(slug) && !SLUGS_RESERVADOS.includes(slug);
}

export function normalizarModoBaixa(valor?: string | null): ModoBaixaFuncionario {
  if (valor === "nenhum" || valor === "direto" || valor === "aprovacao") return valor;
  return "aprovacao";
}

export async function criarTokenFuncionario(fid: string, slug: string) {
  return new SignJWT({ tipo: "funcionario", fid, slug })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
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

export type FuncionarioAutenticado = {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  foto_url: string | null;
  ativo: boolean;
  modo_baixa: ModoBaixaFuncionario;
  ocultar_telefone: boolean;
  pode_ver_documentos: boolean;
};

/**
 * Valida sessão + existência + ativo no banco.
 * Usado por todas as APIs /api/funcionario/* para garantir segurança no servidor.
 */
export async function exigirFuncionarioAtivo(): Promise<
  | { ok: true; funcionario: FuncionarioAutenticado }
  | { ok: false; status: 401 | 403; erro: string }
> {
  const sessao = await lerSessaoFuncionario();
  if (!sessao) {
    return { ok: false, status: 401, erro: "Sessão expirada. Entre novamente." };
  }

  const func = await prisma.funcionario.findUnique({
    where: { id: sessao.fid },
    select: {
      id: true,
      nome: true,
      slug: true,
      telefone: true,
      foto_url: true,
      ativo: true,
      modo_baixa: true,
      ocultar_telefone: true,
      pode_ver_documentos: true,
    },
  });

  if (!func || !func.ativo) {
    return { ok: false, status: 403, erro: "Seu acesso foi desativado pelo administrador." };
  }

  return {
    ok: true,
    funcionario: {
      ...func,
      modo_baixa: normalizarModoBaixa(func.modo_baixa),
    },
  };
}
