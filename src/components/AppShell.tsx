"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

/**
 * Controla o layout principal: no painel do funcionário (/<slug>/cliente) e no /login
 * remove a Navbar do ADM e o container estreito para que a tela ocupe 100% da viewport.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const telaIsolada = pathname === "/login" || /^\/[^/]+\/cliente\/?$/.test(pathname);

  if (telaIsolada) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow w-full max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1880px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 md:pb-8">
        {children}
      </main>
    </>
  );
}
