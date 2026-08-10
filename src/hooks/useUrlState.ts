"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Sincroniza um valor de estado com um query param da URL.
 * Usa router.replace (não push) — não cria entradas no histórico ao trocar filtros.
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
  const router   = useRouter();
  const pathname = usePathname();
  const [value, setInternal] = useState<T>(initial);

  const setValue = useCallback(
    (next: T) => {
      setInternal(next);
      // Usa window.location.search para pegar todos os params atuais
      // (sem precisar de useSearchParams + Suspense)
      const params = new URLSearchParams(window.location.search);
      if (next === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, next);
      }
      const qs  = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: false });
    },
    [router, pathname, key, defaultValue],
  );

  return [value, setValue];
}
