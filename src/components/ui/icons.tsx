type IconProps = Readonly<{ size: number }>;

const STROKE_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function CloseIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} {...STROKE_PROPS}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function BackIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} {...STROKE_PROPS}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function FilterIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} {...STROKE_PROPS}>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </svg>
  );
}

export function SearchIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} {...STROKE_PROPS}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function ClockIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} {...STROKE_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function PlusIcon({ size }: IconProps) {
  return (
    <svg width={size} height={size} {...STROKE_PROPS}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
