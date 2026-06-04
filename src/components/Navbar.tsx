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
  DollarSign
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

  return (
    <header className="bg-[#064e3b] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            {/* Logo Customizada com Escudo e N */}
            <div className="relative flex items-center justify-center w-12 h-12 transition-transform duration-300 group-hover:scale-105">
              {/* Círculo base com gradiente de fundo */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-900 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-300" />
              {/* Borda interna escura */}
              <div className="absolute inset-[2px] bg-[#043e2f] rounded-full border border-emerald-500/30" />
              
              {/* Ícone principal: Escudo */}
              <Shield className="absolute w-[26px] h-[26px] text-emerald-400" strokeWidth={1.5} />
              
              {/* Letra N no centro */}
              <span className="absolute font-black text-xl text-white mt-0.5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
                N
              </span>
              
              {/* Detalhe: Moeda Dourada sobreposta */}
              <div className="absolute -bottom-1 -right-1 bg-[#043e2f] rounded-full p-[3px] shadow-sm">
                <div className="bg-gradient-to-br from-amber-300 to-amber-500 rounded-full w-4 h-4 flex items-center justify-center shadow-inner">
                  <DollarSign className="w-3 h-3 text-[#043e2f]" strokeWidth={4} />
                </div>
              </div>
            </div>

            {/* Texto do Logo */}
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-xl tracking-tight text-white leading-none drop-shadow-sm">
                Soluções <span className="text-emerald-400">Financeiras</span>
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-500/80 uppercase mt-1">
                Gestão de Capital
              </span>
            </div>
          </Link>

          {/* Menu de Navegação */}
          <nav className="flex space-x-1 bg-[#043e2f] p-1.5 rounded-full">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
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

          {/* User info / Sair */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="text-sm bg-[#043e2f] text-emerald-300 border border-emerald-700/50 px-3 py-1 rounded-full hover:bg-emerald-800 transition-colors"
            >
              Painel
            </Link>
            <Link 
              href="/perfil"
              className="text-emerald-200 hover:text-white p-1.5 rounded-full hover:bg-emerald-800/50 transition-colors"
            >
              <User className="w-5 h-5" />
            </Link>
            <button
              onClick={() => alert("Sair do sistema...")}
              className="flex items-center space-x-1.5 text-emerald-200 hover:text-red-300 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
