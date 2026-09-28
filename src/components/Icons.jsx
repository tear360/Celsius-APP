
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };

const make = (paths, viewBox = '0 0 24 24') =>
  function Icon({ size = 18, ...rest }) {
    return (
      <svg width={size} height={size} viewBox={viewBox} aria-hidden="true" {...rest}>
        {paths}
      </svg>
    );
  };

export const IconHome = make(
  <>
    <path d="M3 10.5 12 3l9 7.5" {...S} />
    <path d="M5.5 9.5V20h13V9.5" {...S} />
  </>,
);

export const IconGrid = make(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...S} />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" {...S} />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...S} />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" {...S} />
  </>,
);

export const IconUpdate = make(
  <>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" {...S} />
    <path d="M20 4v5h-5" {...S} />
  </>,
);

export const IconLibrary = make(
  <>
    <rect x="3.5" y="4" width="5" height="16" rx="1.6" {...S} />
    <rect x="10" y="4" width="5" height="16" rx="1.6" {...S} />
    <path d="m17 5.2 3.2 13.4" {...S} />
  </>,
);

export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" {...S} />
    <path
      d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z"
      {...S}
    />
  </>,
);

export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" {...S} />
    <path d="m20 20-3.6-3.6" {...S} />
  </>,
);

export const IconDownload = make(
  <>
    <path d="M12 3.5v11" {...S} />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" {...S} />
    <path d="M4 19.5h16" {...S} />
  </>,
);

export const IconPlay = make(
  <>
    <path d="M7 4.8 19 12 7 19.2Z" {...S} />
  </>,
);

export const IconOpen = make(
  <>
    <path d="M14 4h6v6" {...S} />
    <path d="M20 4 11 13" {...S} />
    <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5" {...S} />
  </>,
);

export const IconPlus = make(
  <>
    <path d="M12 5v14" {...S} />
    <path d="M5 12h14" {...S} />
  </>,
);

export const IconCheck = make(
  <>
    <path d="m5 12.5 4.5 4.5L19 7" {...S} />
  </>,
);

export const IconClose = make(
  <>
    <path d="m6 6 12 12" {...S} />
    <path d="M18 6 6 18" {...S} />
  </>,
);

export const IconTrash = make(
  <>
    <path d="M4.5 7h15" {...S} />
    <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" {...S} />
    <path d="M6.5 7 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" {...S} />
  </>,
);

export const IconBack = make(
  <>
    <path d="M19 12H5" {...S} />
    <path d="m11 6-6 6 6 6" {...S} />
  </>,
);

export const IconExternal = IconOpen;

export const IconRefresh = make(
  <>
    <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5" {...S} />
    <path d="M20.5 4v4.5H16" {...S} />
    <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5" {...S} />
    <path d="M3.5 20v-4.5H8" {...S} />
  </>,
);

export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="9" {...S} />
    <path d="M12 11v5.5" {...S} />
    <path d="M12 7.8h.01" {...S} />
  </>,
);

export const IconAlert = make(
  <>
    <path d="M12 4.5 2.8 20h18.4Z" {...S} />
    <path d="M12 10v4.2" {...S} />
    <path d="M12 17.2h.01" {...S} />
  </>,
);

export const IconBox = make(
  <>
    <path d="M20.5 8.2v7.6a1.5 1.5 0 0 1-.8 1.3l-7 3.6a1.5 1.5 0 0 1-1.4 0l-7-3.6a1.5 1.5 0 0 1-.8-1.3V8.2a1.5 1.5 0 0 1 .8-1.3l7-3.6a1.5 1.5 0 0 1 1.4 0l7 3.6a1.5 1.5 0 0 1 .8 1.3Z" {...S} />
    <path d="m3.7 7.6 8.3 4.3 8.3-4.3" {...S} />
    <path d="M12 20.8v-8.9" {...S} />
  </>,
);

export const IconWindows = make(
  <>
    <path d="M3.5 5.5 10.7 4.4v7.1H3.5Z" {...S} />
    <path d="M11.9 4.2 20.5 3v8.5h-8.6Z" {...S} />
    <path d="M3.5 12.7h7.2v7.1L3.5 18.7Z" {...S} />
    <path d="M11.9 12.7h8.6V21l-8.6-1.2Z" {...S} />
  </>,
);

export const IconAndroid = make(
  <>
    <path d="M6 10.5a6 6 0 0 1 12 0Z" {...S} />
    <path d="M6 10.5v4.2A2.3 2.3 0 0 0 8.3 17h7.4A2.3 2.3 0 0 0 18 14.7v-4.2" {...S} />
    <path d="m6.8 6.6-1.4-2.4" {...S} />
    <path d="m17.2 6.6 1.4-2.4" {...S} />
    <path d="M9.5 19v2.4" {...S} />
    <path d="M14.5 19v2.4" {...S} />
  </>,
);

export const IconStar = make(
  <>
    <path d="m12 4 2.4 5.1 5.6.8-4 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4-3.9 5.6-.8Z" {...S} />
  </>,
);

export const IconGit = make(
  <>
    <circle cx="7" cy="6" r="2.5" {...S} />
    <circle cx="7" cy="18" r="2.5" {...S} />
    <circle cx="17" cy="9" r="2.5" {...S} />
    <path d="M7 8.5v7" {...S} />
    <path d="M9.5 6h3A4.5 4.5 0 0 1 17 6.5" {...S} />
  </>,
);

export const IconChevron = make(
  <>
    <path d="m9 6 6 6-6 6" {...S} />
  </>,
);

export const CelsiusMark = function CelsiusMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="celsius-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#ffe6d5" />
        </linearGradient>
      </defs>
      <path
        d="M31 16.5a12 12 0 1 0 0 15"
        fill="none"
        stroke="url(#celsius-grad)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="36.5" cy="24" r="4" fill="url(#celsius-grad)" />
    </svg>
  );
};
