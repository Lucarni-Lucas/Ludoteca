"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useId, useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { offeredStatuses, type Status, type StatusGroupView } from "@/model/status/status";

import styles from "./StatusDialog.module.css";
import { useStatusText } from "./status-text";

type StatusDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  current: Status;
  groups: readonly StatusGroupView[];
  /** Un juego sin fin no ve «Completado» ni «100%», y uno con final no ve «Jugado» (`04` design.md §19). */
  endless: boolean;
  pending: boolean;
  errorMessage: string | null;
  onSave: (statusId: string) => void;
}>;

type StatusOptionProps = Readonly<{ status: Status; selected: boolean; onPick: () => void }>;

/**
 * Un estado con la línea de qué significa debajo, solo en los de fábrica. La línea va como descripción y no en
 * el nombre del botón, que sigue siendo el del estado.
 */
function StatusOption({ status, selected, onPick }: StatusOptionProps) {
  const statusText = useStatusText();
  const meaningId = useId();
  const meaning = statusText.meaning(status);

  return (
    <button
      type="button"
      className={styles.option}
      aria-pressed={selected}
      aria-describedby={meaning ? meaningId : undefined}
      style={{ "--status-dot": `var(--color-status-${status.color})` } as CSSProperties}
      onClick={onPick}
    >
      <span className={styles.dot} />
      <span className={styles.label}>
        <span>{statusText.name(status)}</span>
        {meaning ? (
          <span id={meaningId} aria-hidden="true" className={styles.meaning}>
            {meaning}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function StatusDialog({
  open,
  onOpenChange,
  title,
  current,
  groups,
  endless,
  pending,
  errorMessage,
  onSave,
}: StatusDialogProps) {
  const t = useTranslations();
  const statusText = useStatusText();
  const [selectedId, setSelectedId] = useState(current.id);
  const offered = groups.map((view) => ({ ...view, statuses: offeredStatuses(view.statuses, { endless, currentId: current.id }) }));
  const selected = offered.flatMap(({ statuses }) => statuses).find(({ id }) => id === selectedId) ?? current;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("status.change")}
      description={t("status.dialog.current", { title, status: statusText.name(current) })}
      wide
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => onSave(selected.id)}>
            {t("status.dialog.saveAs", { status: statusText.name(selected) })}
          </button>
        </>
      }
    >
      <div className={styles.columns}>
        <div className={styles.groups}>
          {offered.map(({ group, statuses }) => (
            <div key={group} className={styles.group}>
              <span className={controls.sectionLabel}>{statusText.group(group)}</span>
              <div className={styles.options}>
                {statuses.map((status) => (
                  <StatusOption key={status.id} status={status} selected={status.id === selected.id} onPick={() => setSelectedId(status.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.panel}>
          {selected.group === "finished" ? (
            <>
              <h2 className={styles.panelTitle}>{t("status.dialog.finishedTitle")}</h2>
              <p className={styles.note}>{t("status.dialog.finishedNote")}</p>
            </>
          ) : (
            <p className={styles.note}>{t("status.dialog.note")}</p>
          )}
          {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
        </div>
      </div>
    </Modal>
  );
}
