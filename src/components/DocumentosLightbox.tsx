"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, FileText } from "lucide-react";

interface DocumentosLightboxProps {
  documentos: string[];
}

export default function DocumentosLightbox({ documentos }: DocumentosLightboxProps) {
  const [aberto, setAberto] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const fechar = useCallback(() => setAberto(null), []);

  const anterior = useCallback(() => {
    setAberto((i) => (i !== null ? (i - 1 + documentos.length) % documentos.length : null));
  }, [documentos.length]);

  const proximo = useCallback(() => {
    setAberto((i) => (i !== null ? (i + 1) % documentos.length : null));
  }, [documentos.length]);

  // Teclado
  useEffect(() => {
    if (aberto === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proximo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, fechar, anterior, proximo]);

  // Bloquear scroll do body quando lightbox aberto
  useEffect(() => {
    if (aberto !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  const handleDownload = async (url: string, idx: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const ext = url.split(".").pop()?.split("?")[0] || "jpg";
      a.download = `documento-${idx + 1}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // fallback: abre em nova aba
      window.open(url, "_blank");
    }
  };

  const urlAtual = aberto !== null ? documentos[aberto] : null;
  const isPdf = urlAtual?.toLowerCase().includes(".pdf");

  return (
    <>
      {/* GRID DE THUMBNAILS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {documentos.map((url, idx) => {
          const pdf = url.toLowerCase().includes(".pdf");
          return (
            <button
              key={idx}
              onClick={() => setAberto(idx)}
              className="relative group border border-slate-200 rounded-xl overflow-hidden bg-slate-50 aspect-square flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={`Abrir documento ${idx + 1}`}
            >
              {pdf ? (
                <div className="flex flex-col items-center justify-center gap-2 p-3 w-full h-full">
                  <FileText className="w-8 h-8 text-red-500" />
                  <span className="text-xs font-bold text-slate-500">
                    PDF {idx + 1}
                  </span>
                </div>
              ) : (
                <>
                  <img
                    src={url}
                    alt={`Documento ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                  />
                  {/* overlay hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* LIGHTBOX */}
      {aberto !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.95)" }}
          onClick={fechar}
        >
          {/* Botão fechar */}
          <button
            onClick={fechar}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Contador */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-bold select-none">
            {aberto + 1} / {documentos.length}
          </div>

          {/* Botão download */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(urlAtual!, aberto); }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-lg transition-all z-10"
            aria-label="Baixar documento"
          >
            <Download className="w-4 h-4" />
            Baixar
          </button>

          {/* Navegar anterior */}
          {documentos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); anterior(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 z-10"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Navegar próximo */}
          {documentos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); proximo(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 z-10"
              aria-label="Próximo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Conteúdo principal */}
          <div
            className="relative max-w-[95vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStartX === null) return;
              const diff = touchStartX - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) diff > 0 ? proximo() : anterior();
              setTouchStartX(null);
            }}
          >
            {isPdf ? (
              <div className="flex flex-col items-center gap-4 text-white">
                <FileText className="w-20 h-20 text-red-400" />
                <p className="text-lg font-bold">Documento PDF</p>
                <a
                  href={urlAtual!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-emerald-400 text-sm"
                >
                  Abrir em nova aba
                </a>
              </div>
            ) : (
              <img
                src={urlAtual!}
                alt={`Documento ${aberto + 1}`}
                className="max-w-[95vw] max-h-[80vh] object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
              />
            )}
          </div>

          {/* Indicadores de ponto */}
          {documentos.length > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
              {documentos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setAberto(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === aberto ? "bg-white scale-125" : "bg-white/30 hover:bg-white/60"}`}
                  aria-label={`Ir para documento ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
