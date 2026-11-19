import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "solucoes-financeiras-super-secret-key-2026"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Painel do funcionário (/<slug>/cliente) e sua API têm autenticação própria (senha do funcionário).
  // Bloqueia Server Actions nessa rota para que ações do ADM não possam ser invocadas por ela.
  const RESERVADOS = ["api", "login", "clientes", "emprestimos", "parceiros", "cobrancas", "configuracoes", "cheques", "mensagens", "perfil"];
  const painel = pathname.match(/^\/([^/]+)\/cliente\/?$/);
  if (painel && !RESERVADOS.includes(painel[1]) && !request.headers.has("next-action")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/funcionario/")) {
    return NextResponse.next();
  }

  // Rotas públicas que não precisam de autenticação
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname.includes("favicon") ||
    pathname.includes("icon") ||
    pathname.includes("apple-icon") ||
    pathname.includes("opengraph-image") ||
    pathname.includes("twitter-image") ||
    pathname.includes("manifest") ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|webmanifest|json)$/i.test(pathname)
  ) {
    // Se tentar acessar o login estando autenticado, vai pro painel
    if (pathname === "/login") {
      const token = request.cookies.get("sol_auth_token")?.value;
      if (token) {
        try {
          await jwtVerify(token, JWT_SECRET);
          return NextResponse.redirect(new URL("/", request.url));
        } catch (e) {
          // Token inválido, segue pro login
        }
      }
    }
    return NextResponse.next();
  }

  // Verificar autenticação
  const token = request.cookies.get("sol_auth_token")?.value;

  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth api routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, icons, manifests
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|webmanifest)$).*)",
  ],
};
