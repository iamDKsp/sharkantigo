"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  BookOpenCheck,
  User,
  LogOut,
  Handshake,
  MessageSquare,
  Shield,
  DollarSign,
  Menu
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const menuItems = [
    { name: "Início", path: "/", icon: LayoutDashboard },
    { name: "Clientes", path: "/clientes", icon: Users },
    { name: "Empréstimos", path: "/emprestimos", icon: HandCoins },
    { name: "Cheques", path: "/cheques", icon: BookOpenCheck },
    { name: "Parceiros", path: "/parceiros", icon: Handshake },
    { name: "Cobranças", path: "/cobrancas", icon: MessageSquare },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (err) {
      console.error("Erro ao sair", err);
    }
  };

  if (pathname === "/login") {
    return null;
  }

  const mobileNavItems = [
    { name: "Início", path: "/", icon: LayoutDashboard },
    { name: "Clientes", path: "/clientes", icon: Users },
    { name: "Empréstimos", path: "/emprestimos", icon: HandCoins },
    { name: "Parceiros", path: "/parceiros", icon: Handshake },
    { name: "Cobranças", path: "/cobrancas", icon: MessageSquare },
  ];

  return (
    <>
      {/* Desktop Header & Mobile Top Bar */}
      <header className="bg-[#064e3b] text-white shadow-md relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3 group active:scale-95 transition-transform">
              {/* Logo Customizada com Escudo e N */}
              <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-900 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300" />
                <div className="absolute inset-[2px] bg-[#043e2f] rounded-full border border-emerald-500/30" />
                <Shield className="absolute w-[22px] h-[22px] md:w-[26px] md:h-[26px] text-emerald-400" strokeWidth={1.5} />
                <span className="absolute font-black text-lg md:text-xl text-white mt-0.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                  N
                </span>
                <div className="absolute -bottom-1 -right-1 bg-[#043e2f] rounded-full p-[2px] md:p-[3px] shadow-sm">
                  <div className="bg-gradient-to-br from-amber-300 to-amber-500 rounded-full w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center shadow-inner">
                    <DollarSign className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#043e2f]" strokeWidth={4} />
                  </div>
                </div>
              </div>

              {/* Texto do Logo */}
              <div className="flex flex-col">
                <span className="font-black text-lg md:text-xl tracking-tight text-white leading-none drop-shadow-sm">
                  Soluções <span className="text-emerald-400">Financeiras</span>
                </span>
                <span className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-emerald-500/80 uppercase mt-1">
                  Gestão de Capital
                </span>
              </div>
            </Link>

            {/* Menu de Navegação - Desktop */}
            <nav className="hidden md:flex space-x-1 bg-[#043e2f] p-1.5 rounded-full">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                      isActive
                        ? "bg-white text-[#064e3b] shadow-sm"
                        : "text-emerald-100 hover:text-white hover:bg-emerald-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User info / Sair - Desktop */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/perfil"
                className="text-emerald-200 hover:text-white p-1.5 rounded-full hover:bg-emerald-800/50 transition-colors active:scale-95"
              >
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 text-emerald-200 hover:text-red-300 text-sm font-medium transition-colors active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>

            {/* Action Icons - Mobile Only (Top Bar) */}
            <div className="md:hidden flex items-center space-x-0.5">
              <Link 
                href="/cheques"
                className="p-2 text-emerald-200 hover:text-white active:scale-95 transition-transform"
              >
                <BookOpenCheck className="w-5 h-5" />
              </Link>
              <Link 
                href="/perfil"
                className="p-2 text-emerald-200 hover:text-white active:scale-95 transition-transform"
              >
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-emerald-200 hover:text-red-300 active:scale-95 transition-transform"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#13221b] border-t border-slate-200 dark:border-emerald-950 flex justify-around items-center h-16 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-90 ${
                isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-400 dark:text-emerald-500/60 hover:text-emerald-500"
              }`}
            >
              <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/40' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] tracking-wide transition-all ${isActive ? 'font-black' : 'font-semibold'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
