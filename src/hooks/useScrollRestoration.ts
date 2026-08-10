"use client";

import { useEffect } from "react";

/**
 * Salva a posição do scroll no sessionStorage ao sair da página
 * e restaura ao voltar (browser back ou botão Voltar do app).
 *
 * @param key Chave única para identificar a página (ex: "emprestimos-list")
 */
export function useScrollRestoration(key: string) {
  const storageKey = `scroll_${key}`;

  // ── Restaura na montagem ──────────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;

    const y = parseInt(saved, 10);
    sessionStorage.removeItem(storageKey);

    if (y > 0) {
      // Pequeno delay para o DOM renderizar os itens antes de scrollar
      const t = setTimeout(
        () => window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior }),
        80,
      );
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Salva ao sair ─────────────────────────────────────────────
  useEffect(() => {
    const save = () => {
      if (window.scrollY > 0) {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }
    };

    // Salva quando a aba fica em segundo plano (ex: browser back nativo)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      save(); // salva no unmount (navegação via router.push/Link)
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storageKey]);
}
