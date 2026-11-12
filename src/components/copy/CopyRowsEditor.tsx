import { useId } from "react";

import controls from "@/components/ui/controls.module.css";
import type { Store } from "@/model/store/store";

import { type CopyRowDraft, CopyRowFields } from "./CopyRowFields";
import styles from "./CopyRowsEditor.module.css";

type CopyRowsEditorProps = Readonly<{
  stores: readonly Store[];
  rows: readonly (CopyRowDraft & Readonly<{ key: number }>)[];
  onAdd: () => void;
  onChange: (key: number, changes: Partial<CopyRowDraft>) => void;
  onRemove: (key: number) => void;
}>;

/** «Dónde y cómo lo tenés» del alta: cero, una o varias copias, cada una en su fila. */
export function CopyRowsEditor({ stores, rows, onAdd, onChange, onRemove }: CopyRowsEditorProps) {
  // En /add pueden convivir dos formularios: el id no se repite.
  const titleId = useId();

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <h2 id={titleId} className={controls.sectionLabel}>
        Dónde y cómo lo tenés
      </h2>
      {rows.length === 0 ? <p className={controls.hint}>Todavía no lo tenés</p> : null}
      {rows.map((row, index) => {
        const name = `Copia ${index + 1}`;

        return (
          <div key={row.key} className={styles.row} role="group" aria-label={name}>
            <div className={styles.rowHeader}>
              <span className={styles.rowTitle}>{name}</span>
              <button
                type="button"
                className={controls.ghost}
                aria-label={`Quitar la copia ${index + 1}`}
                onClick={() => onRemove(row.key)}
              >
                Quitar
              </button>
            </div>
            <CopyRowFields stores={stores} value={row} onChange={(changes) => onChange(row.key, changes)} />
          </div>
        );
      })}
      <button type="button" className={`${controls.secondary} ${styles.add}`} onClick={onAdd}>
        {rows.length === 0 ? "Agregar una copia" : "Agregar otra copia"}
      </button>
    </section>
  );
}
