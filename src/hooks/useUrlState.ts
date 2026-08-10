"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Sincroniza um valor de estado com um query param da URL.
 * Usa router.replace({ scroll: false }) — soft navigation que NÃO
 * desmonta componentes cliente, evitando interrupção de eventos de clique.
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
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      if (next === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, next);
      }
      const qs  = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;

      // router.replace com scroll:false faz soft navigation:
      // reconcilia a árvore sem desmontar/remontar o componente cliente.
      router.replace(url, { scroll: false });
    },
    [router, pathname, key, defaultValue],
  );

  return [value, setValue];
}
