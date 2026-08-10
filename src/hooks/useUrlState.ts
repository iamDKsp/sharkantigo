"use client";

import { useCallback, useState } from "react";

/**
 * Sincroniza um valor de estado com um query param da URL.
 * Usa history.replaceState (não cria entradas no histórico ao trocar filtros).
 * Não usa useRouter/usePathname para evitar mismatch de hidratação.
 *
 * @param key          Nome do query param na URL (ex: "status", "q")
 * @param initial      Valor inicial lido pelo servidor a partir dos searchParams
 * @param defaultValue Valor padrão — quando igual, o param é removido da URL
 */
export function useUrlState<T extends string>(
  key: string,
  initial: T,
  defaultValue: T
): [T, (next: T) => void] {
  const [value, setInternal] = useState<T>(initial);

  const setValue = useCallback(
    (next: T) => {
      setInternal(next);
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      if (next === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, next);
      }
      const qs  = params.toString();
      const url = qs
        ? `${window.location.pathname}?${qs}`
        : window.location.pathname;

      // history.replaceState não dispara eventos de navegação Next.js
      // e não causa re-renderização — apenas atualiza a barra de URL.
      window.history.replaceState(window.history.state ?? {}, "", url);
    },
    [key, defaultValue],
  );

  return [value, setValue];
}
