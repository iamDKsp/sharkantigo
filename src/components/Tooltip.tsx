"use client";

import { useState, useRef, useId } from "react";

interface TooltipProps {
  content: string;
  side?: "top" | "bottom";
  children: React.ReactNode;
  className?: string;
}

/**
 * Tooltip personalizado, leve e acessível (hover + focus-within),
 * com entrada animada suave via tokens do globals.css.
 * Oculto em dispositivos puramente touch onde hover não se aplica.
 */
export default function Tooltip({
  content,
  side = "top",
  children,
  className = "inline-flex",
}: TooltipProps) {
  const [visivel, setVisivel] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  if (!content) return <>{children}</>;

  const abrir = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisivel(true), 120);
  };

  const fechar = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisivel(false);
  };

  const isTop = side === "top";

  return (
    <span
      className={`relative ${className}`}
      onMouseEnter={abrir}
      onMouseLeave={fechar}
      onFocus={abrir}
      onBlur={fechar}
      onMouseDown={fechar}
      aria-describedby={visivel ? id : undefined}
    >
      {children}
      {visivel && (
        <span
          id={id}
          role="tooltip"
          className={`hidden sm:block pointer-events-none absolute left-1/2 z-[80] w-max max-w-[230px] whitespace-normal text-center px-2.5 py-1.5 rounded-xl bg-slate-900/95 text-white text-[11px] font-bold leading-snug shadow-xl shadow-slate-900/20 border border-white/10 backdrop-blur-sm ${
            isTop
              ? "bottom-full mb-2 animate-tooltip-top"
              : "top-full mt-2 animate-tooltip-bottom"
          }`}
        >
          {content}
          <span
            aria-hidden
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900/95 ${
              isTop
                ? "top-full -mt-1 border-r border-b border-white/10"
                : "bottom-full -mb-1 border-l border-t border-white/10"
            }`}
          />
        </span>
      )}
    </span>
  );
}
