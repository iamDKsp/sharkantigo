import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "solucoes-financeiras-super-secret-key-2026"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas que não precisam de autenticação
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.includes("favicon")
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
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
