import React from 'react';

// ไอคอนเส้นชุดเดียวทั้งเว็บ (แทนอิโมจิ) สีตามตัวอักษรรอบข้าง (currentColor)
const PATHS = {
  dashboard: (
    <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z" />
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  list: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9V7a2 2 0 012-2h14a2 2 0 012 2v2a3 3 0 000 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a3 3 0 000-6z" />
      <path d="M14 5v14" strokeDasharray="2 2.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.2 14.3c2.6.2 4.4 1.7 4.8 4.2" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>
  ),
  trash: (
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronUp: <path d="M6 15l6-6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  logout: (
    <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 8l-4 4 4 4M6 12h10" />
  ),
  tech: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  design: (
    <>
      <path d="M4 20l4-1 11-11a2.1 2.1 0 00-3-3L5 16l-1 4z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  career: <path d="M5 20v-7M12 20V5M19 20V9" />,
  download: (
    <>
      <path d="M12 4v11M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 00-14.5-4M4 4v4h4" />
      <path d="M4 13a8 8 0 0014.5 4M20 20v-4h-4" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
};

export default function Icon({
  name,
  size = '1.15em',
  strokeWidth = 1.8,
  className = '',
  style,
}) {
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ verticalAlign: '-0.2em', flexShrink: 0, ...style }}
    >
      {PATHS[name] ?? PATHS.ticket}
    </svg>
  );
}
