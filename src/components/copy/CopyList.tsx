import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { PlusIcon } from "@/components/ui/icons";
import { type Copy, copyDetailLabel, isLost, LOST_REASON_LABELS } from "@/model/copy/copy";
import { formatMonthYear } from "@/model/game/date-format";

import styles from "./CopyList.module.css";

const PLUS_ICON_SIZE = 15;
const STORE_MARK_LENGTH = 3;

type CopyListProps = Readonly<{
  copies: readonly Copy[];
  onAdd: () => void;
  onMarkLost: (copy: Copy) => void;
  onRecover: (copy: Copy) => void;
  onRemove: (copy: Copy) => void;
}>;

function CopyDetail({ copy }: Readonly<{ copy: Copy }>) {
  const label = copyDetailLabel(copy);
  const date = copy.acquiredOn ? ` · ${formatMonthYear(copy.acquiredOn)}` : "";
  const lost = isLost(copy);

  return (
    <>
      <p className={lost ? styles.lostDetail : styles.detail}>
        {label}
        {date}
      </p>
      {lost && copy.lostReason ? <p className={styles.detail}>{LOST_REASON_LABELS[copy.lostReason]}</p> : null}
    </>
  );
}

export function CopyList({ copies, onAdd, onMarkLost, onRecover, onRemove }: CopyListProps) {
  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>Dónde lo tenés</h2>
      {copies.map((copy) => (
        <div key={copy.id} className={styles.card}>
          <div className={styles.main}>
            <span aria-hidden="true" className={styles.mark}>
              {copy.storeName.slice(0, STORE_MARK_LENGTH).toUpperCase()}
            </span>
            <div className={styles.text}>
              <p className={styles.store}>{copy.storeName}</p>
              <CopyDetail copy={copy} />
            </div>
          </div>
          <div className={styles.actions}>
            {isLost(copy) ? (
              <button type="button" className={controls.ghost} onClick={() => onRecover(copy)}>
                Recuperar
              </button>
            ) : (
              <>
                <button type="button" className={controls.ghost} onClick={() => onMarkLost(copy)}>
                  Ya no lo tengo
                </button>
                <HelpTip help={HELP.lost} />
              </>
            )}
            <button
              type="button"
              className={controls.ghost}
              aria-label={`Eliminar copia de ${copy.storeName}`}
              onClick={() => onRemove(copy)}
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
      <button type="button" className={controls.dashed} onClick={onAdd}>
        <PlusIcon size={PLUS_ICON_SIZE} />
        Agregar otra copia
      </button>
    </section>
  );
}
