const OUTLINE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const NAV_ICON_SIZE = 22;
const NAV_STROKE = 1.8;

type IconProps = Readonly<{ size?: number }>;

export function LogoIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="4.5" height="16" rx="1" />
      <rect x="9.5" y="4" width="4.5" height="16" rx="1" />
      <path d="M15.6 5.4l3.9-1 3.6 14.5-3.9 1z" />
    </svg>
  );
}

export function SearchIcon({ size = 18, strokeWidth = 2 }: IconProps & { strokeWidth?: number }) {
  return (
    <svg {...OUTLINE} width={size} height={size} strokeWidth={strokeWidth}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function PlusIcon({ size = 16 }: IconProps) {
  return (
    <svg {...OUTLINE} width={size} height={size} strokeWidth={2.4}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function LibraryNavIcon() {
  return (
    <svg {...OUTLINE} width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} strokeWidth={NAV_STROKE}>
      <rect x="3" y="4" width="4.5" height="16" rx="1" />
      <rect x="9.5" y="4" width="4.5" height="16" rx="1" />
      <path d="M15.6 5.4l3.9-1 3.6 14.5-3.9 1z" />
    </svg>
  );
}

export function CheckNavIcon() {
  return <SearchIcon size={NAV_ICON_SIZE} strokeWidth={NAV_STROKE} />;
}

export function SubscriptionsNavIcon() {
  return (
    <svg {...OUTLINE} width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} strokeWidth={NAV_STROKE}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  );
}

export function StoresNavIcon() {
  return (
    <svg {...OUTLINE} width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} strokeWidth={NAV_STROKE}>
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
