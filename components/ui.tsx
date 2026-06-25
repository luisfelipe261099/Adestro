// Componentes primitivos do design system v2.
// Use estes ao invés de declarar wrappers ad-hoc com Tailwind diretamente.

import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-[var(--border)] pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="text-eyebrow mb-1.5">{eyebrow}</p> : null}
          <h1 className="text-display">{title}</h1>
          {description ? <p className="mt-1 text-subtitle">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || actions) ? (
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            {title ? <h2 className="text-title">{title}</h2> : null}
            {description ? <p className="text-[12.5px] text-[var(--muted)]">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="card-header">
      <div className="min-w-0">
        <h3 className="text-[13.5px] font-semibold text-[var(--foreground)]">{title}</h3>
        {description ? <p className="text-[11.5px] text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-[var(--muted)]">{icon}</div> : null}
      <p className="text-[14px] font-medium text-[var(--foreground)]">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-[12.5px] text-[var(--muted)]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
  href,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
  href?: string;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)]"
      : tone === "warning"
        ? "text-[var(--warning)]"
        : tone === "danger"
          ? "text-[var(--danger)]"
          : "text-[var(--foreground)]";

  const Wrapper: React.ElementType = href ? "a" : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`card group p-4 ${href ? "transition-colors hover:bg-[var(--surface-2)]/40 cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-eyebrow">{label}</span>
        {icon ? <span className="text-[var(--muted)] transition-colors group-hover:text-[var(--foreground)]">{icon}</span> : null}
      </div>
      <p className={`mt-2 text-[24px] font-semibold tracking-tight ${toneClass}`}>{value}</p>
      {delta ? <p className="text-[11.5px] text-[var(--muted)]">{delta}</p> : null}
    </Wrapper>
  );
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ value: T; label: ReactNode; icon?: ReactNode }>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={`tabs ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          type="button"
          aria-selected={value === opt.value}
          data-active={value === opt.value}
          onClick={() => onChange(opt.value)}
          className="tab-trigger"
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Toolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required ? <span className="text-[var(--danger)] ml-0.5">*</span> : null}
      </span>
      {children}
      {error ? (
        <p className="mt-1 text-[11px] text-[var(--danger)]">{error}</p>
      ) : hint ? (
        <p className="help-text">{hint}</p>
      ) : null}
    </label>
  );
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`my-4 border-t border-[var(--border)] ${className}`} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-pulse rounded bg-[var(--surface-2)] ${className}`}
    />
  );
}

export function Avatar({
  name,
  src,
  size = 32,
  className = "",
}: {
  name?: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ""}
        className={`rounded-full object-cover border border-[var(--border)] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--muted-strong)] font-medium ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {initial}
    </span>
  );
}
