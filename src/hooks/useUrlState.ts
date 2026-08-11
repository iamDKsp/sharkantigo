"use client";

import { useEffect, useState } from "react";

/**
 * Sincroniza um valor de estado com um query param da URL.
 *
 * A URL é atualizada via history.replaceState dentro de useEffect (pós-render),
 * o que garante duas propriedades críticas:
 *
 *  1. CORRETO: Quando vários params mudam na mesma renderização (ex: status + pagina),
 *     cada useEffect lê window.location.search já atualizado pelo anterior —
 *     porque history.replaceState é síncrono. Não há race condition.
 *
 *  2. SEGURO: A URL só é atualizada após o ciclo de eventos (render completo),
 *     então nunca interfere com cliques em andamento (mousedown→mouseup→click).
 *
 * @param key          Nome do query param na URL (ex: "status", "q")
 * @param initial      Valor inicial lido pelo servidor via searchParams
 * @param defaultValue Valor padrão — quando igual, o param é removido da URL
 */
export function useUrlState<T extends string>(
  key: string,
  initial: T,
  defaultValue: T
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs  = params.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    // history.replaceState é síncrono: o próximo useEffect já enxerga a URL atualizada.
    // É chamado pós-render, então não interfere com eventos de clique.
    window.history.replaceState(window.history.state, "", url);
  }, [value, key, defaultValue]);

  return [value, setValue];
}
