// Marca do Adestro: badge grafite com uma patinha (logo). Reutilize no header,
// landing, login etc. para manter a identidade consistente. O SVG é o mesmo de
// /public/icon.svg (favicon/PWA).
export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-md bg-[var(--accent)] text-white ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]" fill="currentColor">
        <ellipse cx="25" cy="24" rx="5" ry="7" />
        <ellipse cx="39" cy="24" rx="5" ry="7" />
        <ellipse cx="15.5" cy="31.5" rx="4.5" ry="6" />
        <ellipse cx="48.5" cy="31.5" rx="4.5" ry="6" />
        <path d="M32 30c-7.2 0-13 5-13 11 0 4.4 3.3 7 7.2 7 2.4 0 4-1.2 5.8-1.2s3.4 1.2 5.8 1.2c3.9 0 7.2-2.6 7.2-7 0-6-5.8-11-13-11z" />
      </svg>
    </span>
  );
}
