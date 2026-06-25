// Geração de arquivo .ics (RFC 5545) para baixar e importar no Google/Apple Calendar.
// Não usa API paga e funciona offline — o browser faz download e o usuário importa.

export type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  // YYYY-MM-DD
  date: string;
  // HH:MM (24h)
  startTime: string;
  durationMinutes?: number;
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIcsDate(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(min)}00`;
}

function escapeText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function plusMinutes(date: string, time: string, minutes: number): { date: string; time: string } {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const dt = new Date(y, m - 1, d, h, min);
  dt.setMinutes(dt.getMinutes() + minutes);
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  };
}

export function buildIcs(events: IcsEvent[]): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Adestro//PT-BR//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const duration = ev.durationMinutes ?? 60;
    const end = plusMinutes(ev.date, ev.startTime, duration);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.uid}@adestro`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsDate(ev.date, ev.startTime)}`,
      `DTEND:${toIcsDate(end.date, end.time)}`,
      `SUMMARY:${escapeText(ev.title)}`,
    );
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, events: IcsEvent[]): void {
  const ics = buildIcs(events);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helpers para integração com Google/Outlook web (abre o calendário já com o evento)
export function googleCalendarUrl(ev: IcsEvent): string {
  const start = toIcsDate(ev.date, ev.startTime);
  const dur = ev.durationMinutes ?? 60;
  const end = plusMinutes(ev.date, ev.startTime, dur);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${start}/${toIcsDate(end.date, end.time)}`,
  });
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function googleMapsLink(address?: string | null): string {
  if (!address) return "https://maps.google.com";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
