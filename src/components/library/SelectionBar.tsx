import controls from "@/components/ui/controls.module.css";

import styles from "./SelectionBar.module.css";

type SelectionBarProps = Readonly<{
  count: number;
  /** Con los «Sin interés» a la vista, la misma barra permite volver a mostrarlos. */
  markLabel: string;
  pending: boolean;
  errorMessage: string | null;
  onMark: () => void;
  onCancel: () => void;
}>;

export function SelectionBar({ count, markLabel, pending, errorMessage, onMark, onCancel }: SelectionBarProps) {
  return (
    <div className={styles.bar} role="group" aria-label="Selección">
      <span className={styles.count}>{count === 1 ? "1 seleccionado" : `${count} seleccionados`}</span>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={controls.secondary} onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className={controls.primary} disabled={count === 0 || pending} onClick={onMark}>
          {markLabel}
        </button>
      </div>
    </div>
  );
}
