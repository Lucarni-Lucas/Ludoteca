"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import type { Status, StatusGroupView } from "@/model/status/status";

import styles from "./StatusDialog.module.css";
import { useStatusText } from "./status-text";

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
  const t = useTranslations();
  const statusText = useStatusText();
  const [selectedId, setSelectedId] = useState(current.id);
  const selected = groups.flatMap(({ statuses }) => statuses).find(({ id }) => id === selectedId) ?? current;

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
          {groups.map(({ group, statuses }) => (
            <div key={group} className={styles.group}>
              <span className={controls.sectionLabel}>{statusText.group(group)}</span>
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
                    {statusText.name(status)}
                  </button>
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
