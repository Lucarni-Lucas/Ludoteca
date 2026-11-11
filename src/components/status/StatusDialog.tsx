"use client";

import { type CSSProperties, useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import type { Status, StatusGroupView } from "@/model/status/status";

import styles from "./StatusDialog.module.css";

type StatusDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  current: Status;
  groups: readonly StatusGroupView[];
  pending: boolean;
  errorMessage: string | null;
  onSave: (statusId: string) => void;
}>;

export function StatusDialog({
  open,
  onOpenChange,
  title,
  current,
  groups,
  pending,
  errorMessage,
  onSave,
}: StatusDialogProps) {
  const [selectedId, setSelectedId] = useState(current.id);
  const selected = groups.flatMap(({ statuses }) => statuses).find(({ id }) => id === selectedId) ?? current;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Cambiar estado"
      description={`${title} · ahora: ${current.name}`}
      wide
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => onSave(selected.id)}>
            Guardar como «{selected.name}»
          </button>
        </>
      }
    >
      <div className={styles.columns}>
        <div className={styles.groups}>
          {groups.map(({ group, label, statuses }) => (
            <div key={group} className={styles.group}>
              <span className={controls.sectionLabel}>{label}</span>
              <div className={styles.options}>
                {statuses.map((status) => (
                  <button
                    key={status.id}
                    type="button"
                    className={styles.option}
                    aria-pressed={status.id === selected.id}
                    style={{ "--status-dot": `var(--color-status-${status.color})` } as CSSProperties}
                    onClick={() => setSelectedId(status.id)}
                  >
                    <span className={styles.dot} />
                    {status.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.panel}>
          {selected.group === "finished" ? (
            <>
              <h2 className={styles.panelTitle}>¡Terminado!</h2>
              <p className={styles.note}>Guardamos la fecha de hoy como fecha de fin. Después podés ponerle puntaje.</p>
            </>
          ) : (
            <p className={styles.note}>El cambio queda registrado con la fecha de hoy.</p>
          )}
          {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
        </div>
      </div>
    </Modal>
  );
}
