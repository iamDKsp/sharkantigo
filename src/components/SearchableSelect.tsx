"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, User } from "lucide-react";

interface Option {
  id: string;
  nome: string;
  telefone?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name: string; // Para usar no FormData oculto
}

export default function SearchableSelect({ options, value, onChange, placeholder = "Selecione...", name }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filteredOptions = options.filter((opt) => 
    norm(opt.nome).includes(norm(search)) || 
    (opt.telefone && opt.telefone.includes(search))
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Campo Oculto para o FormData funcionar nativamente */}
      <input type="hidden" name={name} value={value} />

      {/* Botão Principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left bg-transparent border-none p-3 text-slate-900 dark:text-white font-medium flex items-center justify-between"
      >
        <span className={!selectedOption ? "text-slate-400" : ""}>
          {selectedOption ? selectedOption.nome : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {/* Menu Dropdown Animado */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white dark:bg-[#13221b] border border-slate-200 dark:border-emerald-950 rounded-xl shadow-xl max-h-72 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Barra de Busca */}
          <div className="p-3 border-b border-slate-100 dark:border-emerald-950/50 relative">
            <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pelo nome ou número..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-emerald-950/20 border-none rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none"
            />
          </div>

          {/* Lista de Opções */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                Nenhuma pessoa encontrada.
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg flex flex-col transition-colors ${
                    value === opt.id 
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                    : "hover:bg-slate-50 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="font-bold text-sm">{opt.nome}</span>
                  {opt.telefone && (
                    <span className="text-xs text-slate-500 dark:text-emerald-500/70 font-medium">
                      {opt.telefone}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
