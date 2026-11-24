import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import type { ImportSummary } from "@/model/import/confirm";
import type { ReadyCounts } from "@/model/import/review";

import styles from "./ConfirmCard.module.css";

type ConfirmCardProps = Readonly<{
  ready: ReadyCounts;
  confirming: boolean;
  summary: ImportSummary | null;
  errorMessage: string | null;
  onConfirm: () => void;
}>;

function Summary({ summary }: Readonly<{ summary: ImportSummary }>) {
  const t = useTranslations("import.confirm");

  return (
    <div role="status" className={styles.summary}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 12 5 5 9-10" />
      </svg>
      <p className={styles.summaryText}>{t("summary", { ...summary })}</p>
    </div>
  );
}

/** Al final del contenido y no fijo: en el celu, abajo está la barra de secciones (design.md §15). */
export function ConfirmCard({ ready, confirming, summary, errorMessage, onConfirm }: ConfirmCardProps) {
  const t = useTranslations("import.confirm");
  const empty = ready.games === 0 && ready.copies === 0;

  return (
    <>
      {summary ? <Summary summary={summary} /> : null}
      <section className={styles.card} aria-label={t("action")}>
        <div className={styles.text}>
          <p className={styles.ready}>
            {t.rich("ready", {
              games: ready.games,
              copies: ready.copies,
              n: (chunks) => <span className={styles.number}>{chunks}</span>,
            })}
          </p>
          <p className={styles.explanation}>{empty ? t("nothingReady") : t("explanation")}</p>
          {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
        </div>
        <button type="button" className={controls.primary} disabled={empty || confirming} onClick={onConfirm}>
          {confirming ? t("confirming") : t("action")}
        </button>
      </section>
    </>
  );
}
