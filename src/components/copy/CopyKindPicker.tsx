import controls from "@/components/ui/controls.module.css";
import { COPY_KIND_LABELS, COPY_KINDS, type CopyKind } from "@/model/copy/copy";

import styles from "./CopyKindPicker.module.css";

type CopyKindPickerProps = Readonly<{
  value: CopyKind | null;
  onChange: (kind: CopyKind | null) => void;
  /** En el alta de un juego, «Todavía no lo tengo» significa que no hay copia. */
  allowNone?: boolean;
}>;

export function CopyKindPicker({ value, onChange, allowNone }: CopyKindPickerProps) {
  return (
    <div className={styles.picker}>
      <span className={styles.label}>Cómo lo tenés</span>
      <div className={styles.options}>
        {COPY_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={controls.pill}
            aria-pressed={value === kind}
            onClick={() => onChange(kind)}
          >
            {COPY_KIND_LABELS[kind]}
          </button>
        ))}
        {allowNone ? (
          <button type="button" className={controls.pill} aria-pressed={value === null} onClick={() => onChange(null)}>
            Todavía no lo tengo
          </button>
        ) : null}
      </div>
    </div>
  );
}
