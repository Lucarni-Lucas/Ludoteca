import type { CSSProperties, ReactNode } from "react";

import type { StatusGroup } from "@/model/status/status-group";

import styles from "./StatusBadge.module.css";

const GROUP_TOKENS: Readonly<Record<StatusGroup, { color: string; background: string }>> = {
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

type StatusBadgeProps = Readonly<{
  group: StatusGroup;
  children: ReactNode;
}>;

export function StatusBadge({ group, children }: StatusBadgeProps) {
  const { color, background } = GROUP_TOKENS[group];
  const style = { "--badge-color": color, "--badge-background": background } as CSSProperties;

  return (
    <span className={styles.badge} style={style}>
      {children}
    </span>
  );
}
