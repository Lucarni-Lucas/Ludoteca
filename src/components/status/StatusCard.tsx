import type { CSSProperties } from "react";

import controls from "@/components/ui/controls.module.css";
import { type Status, statusSinceLabel } from "@/model/status/status";

import styles from "./StatusCard.module.css";

type StatusCardProps = Readonly<{
  status: Status;
  statusSince: string;
  onChange: () => void;
}>;

export function StatusCard({ status, statusSince, onChange }: StatusCardProps) {
  const dot = { "--status-dot": `var(--color-status-${status.color})` } as CSSProperties;

  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>Estado</h2>
      <div className={styles.card}>
        <span className={styles.summary}>
          <span className={styles.dot} style={dot} />
          <span className={styles.texts}>
            <span className={styles.name}>{status.name}</span>
            <span className={styles.detail}>{statusSinceLabel(status, statusSince)}</span>
          </span>
        </span>
        <button type="button" className={`${controls.secondary} ${styles.button}`} onClick={onChange}>
          Cambiar estado
        </button>
      </div>
    </section>
  );
}
