"use client";

// Seletor de horário em blocos de 15 minutos (00 / 15 / 30 / 45).
// Dois selects nativos em vez de <input type="time"> porque o atributo `step`
// é ignorado pelos pickers móveis, que deixavam marcar horários como 09:37.

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

type TimeSelectProps = {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
};

function snapMinute(raw: string): string {
  if (MINUTES.includes(raw)) return raw;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return "00";
  const index = Math.min(3, Math.max(0, Math.round(parsed / 15)));
  return MINUTES[index];
}

export function TimeSelect({ value, onChange, className = "", required }: TimeSelectProps) {
  const [hourRaw = "09", minuteRaw = "00"] = value.split(":");
  const hour = HOURS.includes(hourRaw.padStart(2, "0")) ? hourRaw.padStart(2, "0") : "09";
  const minute = snapMinute(minuteRaw);

  const selectClass =
    "rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-sky-400";

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <select
        aria-label="Hora"
        value={hour}
        onChange={(event) => onChange(`${event.target.value}:${minute}`)}
        className={selectClass}
        required={required}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}h
          </option>
        ))}
      </select>
      <span className="text-sm font-semibold text-[var(--muted)]">:</span>
      <select
        aria-label="Minutos"
        value={minute}
        onChange={(event) => onChange(`${hour}:${event.target.value}`)}
        className={selectClass}
        required={required}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
