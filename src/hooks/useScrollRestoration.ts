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
    if (isNaN(y) || y <= 0) {
      sessionStorage.removeItem(storageKey);
      return;
    }

    const restore = () => {
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    };

    // Executa imediatamente e com delays escalonados para aguardar
    // a hidratação, renderização do DOM e filtragem da lista.
    restore();
    const t1 = setTimeout(restore, 50);
    const t2 = setTimeout(restore, 150);
    const t3 = setTimeout(restore, 300);
    const t4 = setTimeout(() => {
      restore();
      sessionStorage.removeItem(storageKey);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Salva ao scrollar / sair ──────────────────────────────────
  useEffect(() => {
    const save = () => {
      if (window.scrollY > 0) {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }
    };

    const onScroll = () => {
      if (window.scrollY > 0) {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Salva quando a aba fica em segundo plano (ex: browser back nativo)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      save(); // salva no unmount (navegação via router.push/Link)
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [storageKey]);
}

