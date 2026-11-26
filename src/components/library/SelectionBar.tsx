import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./SelectionBar.module.css";

type SelectionBarProps = Readonly<{
  count: number;
  /** Con los ocultos a la vista, la misma barra permite volver a mostrarlos. */
  markLabel: string;
  pending: boolean;
  errorMessage: string | null;
  onMark: () => void;
  onCancel: () => void;
}>;

export function SelectionBar({ count, markLabel, pending, errorMessage, onMark, onCancel }: SelectionBarProps) {
  const t = useTranslations();

  return (
    <div className={styles.bar} role="group" aria-label={t("library.selection.label")}>
      <span className={styles.count}>{t("library.selection.count", { count })}</span>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={controls.secondary} onClick={onCancel}>
          {t("common.cancel")}
        </button>
        <button type="button" className={controls.primary} disabled={count === 0 || pending} onClick={onMark}>
          {markLabel}
        </button>
      </div>
    </div>
  );
}
