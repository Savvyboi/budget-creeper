/** Inline icons. Stroke-based, currentColor, 1.6px — one visual family. */

interface IconProps {
  size?: number;
  className?: string;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
});

export const IconSearch = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="8.75" cy="8.75" r="5.25" />
    <path d="m12.6 12.6 3.4 3.4" />
  </svg>
);

export const IconChevronRight = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m7.5 4.5 5 5.5-5 5.5" />
  </svg>
);

export const IconChevronDown = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m4.5 7.5 5.5 5 5.5-5" />
  </svg>
);

export const IconArrowLeft = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M16 10H4.5m0 0L9 5.5M4.5 10 9 14.5" />
  </svg>
);

export const IconClose = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);

export const IconSun = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="10" r="3.6" />
    <path d="M10 1.8v1.8M10 16.4v1.8M18.2 10h-1.8M3.6 10H1.8M15.8 4.2l-1.3 1.3M5.5 14.5l-1.3 1.3M15.8 15.8l-1.3-1.3M5.5 5.5 4.2 4.2" />
  </svg>
);

export const IconMoon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M16.2 11.8A6.8 6.8 0 0 1 8.2 3.8a6.8 6.8 0 1 0 8 8Z" />
  </svg>
);

export const IconAuto = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="10" r="6.8" />
    <path d="M10 3.2v13.6" />
    <path d="M10 3.2a6.8 6.8 0 0 1 0 13.6Z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconGlobe = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="10" r="6.8" />
    <path d="M3.2 10h13.6" />
    <path d="M10 3.2c1.8 2 2.7 4.3 2.7 6.8s-.9 4.8-2.7 6.8c-1.8-2-2.7-4.3-2.7-6.8S8.2 5.2 10 3.2Z" />
  </svg>
);

export const IconDownload = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 3v9m0 0 3.4-3.4M10 12 6.6 8.6" />
    <path d="M3.6 14v1.6a1.4 1.4 0 0 0 1.4 1.4h10a1.4 1.4 0 0 0 1.4-1.4V14" />
  </svg>
);

export const IconExternal = ({ size = 14 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M11 3h6v6" />
    <path d="M17 3 9.5 10.5" />
    <path d="M15 12v3.6A1.4 1.4 0 0 1 13.6 17H4.4A1.4 1.4 0 0 1 3 15.6V6.4A1.4 1.4 0 0 1 4.4 5H8" />
  </svg>
);

export const IconInfo = ({ size = 15 }: IconProps) => (
  <svg {...base(size)}>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 9v4.5" />
    <circle cx="10" cy="6.6" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCoins = ({ size = 20 }: IconProps) => (
  <svg {...base(size)}>
    <ellipse cx="10" cy="5" rx="6.2" ry="2.4" />
    <path d="M3.8 5v4.2c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V5" />
    <path d="M3.8 9.4v4.2c0 1.3 2.8 2.4 6.2 2.4s6.2-1.1 6.2-2.4V9.4" />
  </svg>
);

export const IconMap = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="9" rx="1.2" />
    <rect x="12" y="3" width="5" height="5" rx="1.2" />
    <rect x="12" y="10" width="5" height="7" rx="1.2" />
    <rect x="3" y="14" width="7" height="3" rx="1.2" />
  </svg>
);

export const IconList = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M3 5.5h14M3 10h14M3 14.5h9" />
  </svg>
);

export const IconTable = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="14" height="12" rx="1.4" />
    <path d="M3 8h14M8.5 8v8" />
  </svg>
);

export const IconWarning = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}>
    <path d="M10 3.4 17.2 16H2.8L10 3.4Z" />
    <path d="M10 8.2v3.4" />
    <circle cx="10" cy="13.7" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);
