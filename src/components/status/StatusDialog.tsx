"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useId, useState } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { COMPLETED_KEY, endlessChangeOf, type MarkChoice, type Status, type StatusGroupView } from "@/model/status/status";

import { EndlessConfirm } from "./EndlessConfirm";
import styles from "./StatusDialog.module.css";
import { useStatusText } from "./status-text";

type StatusDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  current: Status;
  groups: readonly StatusGroupView[];
  /** Si el juego es sin fin: «Jugado» y «Completado» pueden cambiarlo, con el aviso (`04` design.md §22). */
  endless: boolean;
  /** La marca «100%» que ya tiene el juego. */
  hundredPercent: boolean;
  pending: boolean;
  errorMessage: string | null;
  /** Sin `marks` no cambia ninguna marca: así se llama como siempre cuando no hay nada que decir. */
  onSave: (statusId: string, marks?: MarkChoice) => void;
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
  hundredPercent,
  pending,
  errorMessage,
  onSave,
}: StatusDialogProps) {
  const t = useTranslations();
  const statusText = useStatusText();
  const [selectedId, setSelectedId] = useState(current.id);
  const [hundred, setHundred] = useState(hundredPercent);
  const [confirming, setConfirming] = useState(false);
  const selected = groups.flatMap(({ statuses }) => statuses).find(({ id }) => id === selectedId) ?? current;
  const completed = selected.systemKey === COMPLETED_KEY;
  const endlessChange = endlessChangeOf(endless, selected);

  /** Solo lo que cambia: la casilla si cambió, y el aviso si se aceptó. */
  function marksOf(acceptEndless: boolean): MarkChoice | undefined {
    const marks: MarkChoice = {
      ...(completed && hundred !== hundredPercent ? { hundredPercent: hundred } : {}),
      ...(acceptEndless ? { acceptEndless: true } : {}),
    };
    return Object.keys(marks).length > 0 ? marks : undefined;
  }

  /** El aviso sale al guardar: elegir una opción todavía no cambia nada (`04` design.md §22). */
  function save(): void {
    if (endlessChange === null) {
      onSave(selected.id, marksOf(false));
      return;
    }

    setConfirming(true);
  }

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
          <button type="button" className={controls.primary} disabled={pending} onClick={save}>
            {t("status.dialog.saveAs", { status: statusText.name(selected) })}
          </button>
        </>
      }
    >
      <div className={styles.columns}>
        <div className={styles.groups}>
          {groups.map(({ group, statuses }) => (
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
              {completed ? <Checkbox label={t("status.hundredPercent")} checked={hundred} onCheckedChange={setHundred} /> : null}
            </>
          ) : (
            <p className={styles.note}>{t("status.dialog.note")}</p>
          )}
          {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
        </div>
      </div>
      {confirming && endlessChange !== null ? (
        <EndlessConfirm
          endless={endlessChange}
          pending={pending}
          errorMessage={errorMessage}
          onCancel={() => setConfirming(false)}
          onAccept={() => onSave(selected.id, marksOf(true))}
        />
      ) : null}
    </Modal>
  );
}
