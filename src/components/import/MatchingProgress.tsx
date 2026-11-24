import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./MatchingProgress.module.css";

const PERCENT = 100;

type MatchingProgressProps = Readonly<{
  done: number;
  total: number;
  errorMessage: string | null;
  onRetry: () => void;
}>;

/** «Cruzando con IGDB · 120 de 540»: se puede ir revisando lo que ya cruzó. */
export function MatchingProgress({ done, total, errorMessage, onRetry }: MatchingProgressProps) {
  const t = useTranslations("import.progress");
  const percent = total === 0 ? PERCENT : Math.round((done / total) * PERCENT);

  return (
    <section className={styles.box} aria-label={t("label")}>
      <div role="status" className={styles.line}>
        <span>{t("label")}</span>
        <span className={styles.count}>{t("count", { done, total })}</span>
      </div>
      <div
        role="progressbar"
        aria-label={t("label")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className={styles.track}
      >
        <div className={styles.bar} style={{ width: `${percent}%` }} />
      </div>
      {errorMessage ? (
        <div className={styles.failed}>
          <p className={styles.error}>{errorMessage}</p>
          <button type="button" className={controls.secondary} onClick={onRetry}>
            {t("retry")}
          </button>
        </div>
      ) : (
        <p className={styles.hint}>{t("hint")}</p>
      )}
    </section>
  );
}
