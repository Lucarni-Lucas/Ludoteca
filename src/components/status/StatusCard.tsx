import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";

import controls from "@/components/ui/controls.module.css";
import type { Status } from "@/model/status/status";

import { useStatusText } from "./status-text";
import styles from "./StatusCard.module.css";

type StatusCardProps = Readonly<{
  status: Status;
  statusSince: string;
  onChange: () => void;
}>;

export function StatusCard({ status, statusSince, onChange }: StatusCardProps) {
  const t = useTranslations("status");
  const statusText = useStatusText();
  const dot = { "--status-dot": `var(--color-status-${status.color})` } as CSSProperties;

  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>{t("title")}</h2>
      <div className={styles.card}>
        <span className={styles.summary}>
          <span className={styles.dot} style={dot} />
          <span className={styles.texts}>
            <span className={styles.name}>{statusText.name(status)}</span>
            <span className={styles.detail}>{statusText.since(status, statusSince)}</span>
          </span>
        </span>
        <button type="button" className={`${controls.secondary} ${styles.button}`} onClick={onChange}>
          {t("change")}
        </button>
      </div>
    </section>
  );
}
