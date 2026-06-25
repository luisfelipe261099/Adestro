// Biblioteca de ícones SVG inline (estilo Lucide/Heroicons) — sem dependência
// externa. Linhas finas, traço 1.75, geometria limpa. Substitui emojis em
// superfícies profissionais.

type IconProps = React.SVGProps<SVGSVGElement> & { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const make = (path: React.ReactNode) =>
  function Icon({ className = "h-4 w-4", ...rest }: IconProps) {
    return (
      <svg className={className} {...base} {...rest}>
        {path}
      </svg>
    );
  };

export const IconHome = make(
  <>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </>,
);

export const IconCalendar = make(
  <>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </>,
);

export const IconUsers = make(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 11a3 3 0 1 0 0-6" />
    <path d="M21.5 20a5 5 0 0 0-5-5" />
  </>,
);

export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </>,
);

export const IconDog = make(
  <>
    <path d="M10 5 7 3v3.5L5 8v3l-2 1v5a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-5l-2-1V8l-2-1.5V3l-3 2" />
    <path d="M9 13h.01M15 13h.01" />
    <path d="M12 16c.667.667 1.333.667 2 0" />
  </>,
);

export const IconReceipt = make(
  <>
    <path d="M4 4v17l2.5-2 2.5 2 2.5-2 2.5 2 2.5-2L19 21V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1Z" />
    <path d="M7 7h9M7 11h9M7 15h6" />
  </>,
);

export const IconReport = make(
  <>
    <path d="M5 3h11l4 4v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M15 3v5h5" />
    <path d="M8 13v5M12 10v8M16 15v3" />
  </>,
);

export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </>,
);

export const IconBell = make(
  <>
    <path d="M5.5 17a2 2 0 0 1 .5-1.3l1-1.2V10a5 5 0 0 1 10 0v4.5l1 1.2c.3.4.5.8.5 1.3" />
    <path d="M9 21a3 3 0 0 0 6 0" />
    <path d="M5 17h14" />
  </>,
);

export const IconChevronRight = make(<path d="m9 6 6 6-6 6" />);
export const IconChevronLeft = make(<path d="m15 6-6 6 6 6" />);
export const IconChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const IconChevronUp = make(<path d="m6 15 6-6 6 6" />);
export const IconArrowRight = make(<><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>);
export const IconArrowLeft = make(<><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>);

export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconClose = make(<path d="m6 6 12 12M18 6 6 18" />);
export const IconCheck = make(<path d="m5 12 5 5L20 7" />);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

export const IconExternal = make(
  <>
    <path d="M14 4h6v6" />
    <path d="M10 14 20 4" />
    <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
  </>,
);

export const IconWhatsApp = make(
  <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.4A10 10 0 1 0 12 2Zm5.4 14a3 3 0 0 1-2 1.4c-.5 0-1.2 0-3.6-1-2.7-1-4.4-3.7-4.6-3.9-.1-.2-1-1.4-1-2.6 0-1.3.7-1.9 1-2.2.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.2.6.2.3.7 1.2 1.5 2 1.1 1 2 1.3 2.2 1.4.3.1.4.1.6 0l.7-.8c.2-.2.4-.2.6-.1l1.9.9c.3.1.4.2.5.4 0 .2 0 1-.3 1.4Z" stroke="none" fill="currentColor" />,
);

export const IconMap = make(
  <>
    <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2Z" />
    <path d="M9 3v16M15 5v16" />
  </>,
);

export const IconClock = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);

export const IconSparkle = make(
  <>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.5 2.5M16 16l2.5 2.5M5.5 18.5 8 16M16 8l2.5-2.5" />
  </>,
);

export const IconLogout = make(
  <>
    <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>,
);

export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);

export const IconCheckSquare = make(
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="m8 12 3 3 5-6" />
  </>,
);

export const IconDollar = make(
  <>
    <path d="M12 3v18" />
    <path d="M16 7H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H8" />
  </>,
);

export const IconTag = make(
  <>
    <path d="M20 12V4h-8L4 12l8 8 8-8Z" />
    <circle cx="9" cy="9" r="1.5" />
  </>,
);

export const IconAlert = make(
  <>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </>,
);

export const IconLink = make(
  <>
    <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.5" />
    <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
  </>,
);

export const IconChat = make(
  <>
    <path d="M3 12a8 8 0 1 1 4 7l-4 1 1-3.5A8 8 0 0 1 3 12Z" />
  </>,
);

export const IconCopy = make(
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </>,
);

export const IconDownload = make(
  <>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M5 20h14" />
  </>,
);

export const IconUpload = make(
  <>
    <path d="M12 20V8" />
    <path d="m7 13 5-5 5 5" />
    <path d="M5 4h14" />
  </>,
);

export const IconMic = make(
  <>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M19 11a7 7 0 0 1-14 0" />
    <path d="M12 18v3" />
  </>,
);

export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
  </>,
);

export const IconMoon = make(<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z" />);

export const IconStar = make(<path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3Z" />);
