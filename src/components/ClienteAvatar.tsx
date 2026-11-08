"use client";

import { useState } from "react";

interface Props {
  nome: string;
  /** URL da foto. Sem foto (ou se falhar ao carregar) mostra só a inicial do nome. */
  src?: string | null;
  /** Tamanho e posição (ex.: "w-12 h-12 text-base"). */
  className?: string;
}

export default function ClienteAvatar({ nome, src, className = "w-12 h-12 text-base" }: Props) {
  const [falhou, setFalhou] = useState(false);
  const letra = (nome.trim().charAt(0) || "?").toUpperCase();

  if (src && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFalhou(true)}
        className={`rounded-2xl object-cover border border-slate-200 bg-slate-100 pointer-events-none select-none shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`rounded-2xl bg-emerald-600 text-white font-bold flex items-center justify-center shadow-sm pointer-events-none select-none shrink-0 ${className}`}
    >
      {letra}
    </div>
  );
}
