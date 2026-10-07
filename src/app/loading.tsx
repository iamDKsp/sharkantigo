export default function Loading() {
  return (
    <div className="space-y-8 w-full max-w-7xl 2xl:max-w-[1600px] 3xl:max-w-[1880px] mx-auto px-1 animate-fade-in" aria-busy="true" aria-label="Carregando conteúdo...">
      {/* Cabeçalho Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="h-4 w-28 rounded-md skeleton-shimmer" />
          </div>
          <div className="h-8 w-56 sm:w-72 rounded-xl skeleton-shimmer" />
          <div className="h-4 w-40 sm:w-64 rounded-md skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-xl skeleton-shimmer" />
          <div className="h-10 w-36 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      {/* Grid de 4 Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded-md skeleton-shimmer" />
              <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-36 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-24 rounded-md skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Seção Principal: 2 Colunas (Gráfico / Resumo + Lista) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Maior (2/3) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-44 rounded-md skeleton-shimmer" />
              <div className="h-3.5 w-60 rounded-md skeleton-shimmer" />
            </div>
            <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
          </div>

          {/* Linhas de Tabela/Lista Skeleton */}
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full skeleton-shimmer shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 sm:w-48 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-24 rounded-md skeleton-shimmer" />
                  </div>
                </div>
                <div className="text-right space-y-1.5">
                  <div className="h-4 w-20 rounded-md skeleton-shimmer ml-auto" />
                  <div className="h-3 w-16 rounded-md skeleton-shimmer ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna Menor (1/3) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-1.5">
            <div className="h-5 w-36 rounded-md skeleton-shimmer" />
            <div className="h-3.5 w-48 rounded-md skeleton-shimmer" />
          </div>

          {/* Gráfico circular / placeholder */}
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-36 h-36 rounded-full border-8 border-slate-100 skeleton-shimmer" />
            <div className="flex items-center gap-4 pt-2">
              <div className="h-3 w-16 rounded skeleton-shimmer" />
              <div className="h-3 w-16 rounded skeleton-shimmer" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-20 rounded skeleton-shimmer" />
              <div className="h-3.5 w-16 rounded skeleton-shimmer" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 rounded skeleton-shimmer" />
              <div className="h-3.5 w-14 rounded skeleton-shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
