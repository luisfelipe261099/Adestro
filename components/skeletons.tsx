// Componentes reutilizáveis de skeleton (loader visual).
// Substituem mensagens "Carregando..." por blocos animados que dão
// percepção de velocidade ao usuário.

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-pulse rounded bg-slate-200/70 dark:bg-slate-700/40 ${className}`}
    />
  );
}

export function SkeletonCard({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      className={`rounded-2xl border border-[var(--border)] bg-white p-4 ${className}`}
    >
      <SkeletonLine className="h-3 w-1/3" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <SkeletonLine key={idx} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonCard key={idx} rows={2} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-700/40"
      style={{ width: size, height: size }}
    />
  );
}
