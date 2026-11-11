import type { CSSProperties, ReactNode } from "react";

import type { StatusColor } from "@/model/status/status";
import type { StatusGroup } from "@/model/status/status-group";

import styles from "./StatusBadge.module.css";

type BadgeTokens = Readonly<{ color: string; background: string }>;

const GROUP_TOKENS: Readonly<Record<StatusGroup, BadgeTokens>> = {
  in_progress: {
    color: "var(--color-status-in-progress)",
    background: "var(--color-status-in-progress-bg)",
  },
  not_started: {
    color: "var(--color-status-not-started)",
    background: "var(--color-status-not-started-bg)",
  },
  finished: {
    color: "var(--color-status-finished)",
    background: "var(--color-status-finished-bg)",
  },
  dropped: {
    color: "var(--color-status-dropped)",
    background: "var(--color-status-dropped-bg)",
  },
};

function paletteTokens(color: StatusColor): BadgeTokens {
  return { color: `var(--color-status-${color})`, background: `var(--color-status-${color}-bg)` };
}

type StatusBadgeProps = Readonly<{
  group: StatusGroup;
  color?: StatusColor;
  children: ReactNode;
}>;

export function StatusBadge({ group, color, children }: StatusBadgeProps) {
  const tokens = color ? paletteTokens(color) : GROUP_TOKENS[group];
  const style = { "--badge-color": tokens.color, "--badge-background": tokens.background } as CSSProperties;

  return (
    <span className={styles.badge} style={style}>
      {children}
    </span>
  );
}
