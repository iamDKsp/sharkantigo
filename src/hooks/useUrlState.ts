"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Sincroniza um valor de estado com um query param da URL.
 *
 *  1. Lê o query param da URL (window.location.search) na inicialização
 *     para não resetar o estado quando o usuário volta (browser back ou router.back).
 *  2. Ouve o evento 'popstate' para atualizar o estado caso o usuário use os botões
 *     de voltar/avançar do navegador.
 *  3. Atualiza a URL via history.replaceState sem disparar re-render no Next.js
 *     e sem remover parâmetros no primeiro render.
 *
 * @param key          Nome do query param na URL (ex: "status", "q")
 * @param initial      Valor inicial lido pelo servidor via searchParams
 * @param defaultValue Valor padrão — quando igual, o param é removido da URL
 * @param sanitize     Função opcional para validar/sanitizar o valor vindo da URL
 */
export function useUrlState<T extends string>(
  key: string,
  initial: T,
  defaultValue: T,
  sanitize?: (val: string) => T
): [T, (next: T) => void] {
  // Inicializa priorizando o valor real presente na URL do navegador
  const [value, setValue] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const fromUrl = new URLSearchParams(window.location.search).get(key);
      if (fromUrl !== null && fromUrl !== "") {
        return sanitize ? sanitize(fromUrl) : (fromUrl as T);
      }
    }
    return initial;
  });

  const isFirstRender = useRef(true);

  // Sincroniza quando o usuário navega pelo histórico nativo (Voltar / Avançar)
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get(key);
      if (fromUrl !== null && fromUrl !== "") {
        setValue(sanitize ? sanitize(fromUrl) : (fromUrl as T));
      } else {
        setValue(defaultValue);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [key, defaultValue, sanitize]);

  // Atualiza a URL quando o valor do estado mudar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const currentParam = params.get(key);

    // No primeiro render, evita apagar parâmetros existentes na URL
    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Se a URL já possui o valor atual do estado, não precisa regravar
      if (currentParam === value) return;
      // Se o estado é defaultValue e a URL não tem este param, nada a fazer
      if (value === defaultValue && !params.has(key)) return;
    }

    if (value === defaultValue) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const qs = params.toString();
    const targetUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;

    const currentUrl =
      window.location.pathname + (window.location.search || "");

    if (currentUrl !== targetUrl) {
      window.history.replaceState(window.history.state, "", targetUrl);
    }
  }, [value, key, defaultValue]);

  return [value, setValue];
}

