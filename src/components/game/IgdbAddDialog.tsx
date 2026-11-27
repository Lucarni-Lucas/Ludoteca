"use client";

import { useTranslations } from "next-intl";

import { CopyRowsEditor } from "@/components/copy/CopyRowsEditor";
import { StatusSelect } from "@/components/status/StatusSelect";
import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { type EntryValues, useEntryForm } from "@/hooks/use-entry-form";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

import { EntryStatusExtras } from "./EntryStatusExtras";
import { ScoreInput } from "./ScoreInput";

type IgdbAddDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stores: readonly Store[];
  statusGroups: readonly StatusGroupView[];
  pending: boolean;
  errorMessage: string | null;
  onSave: (values: EntryValues) => void;
}>;

/**
 * El alta desde IGDB: el mismo formulario que a mano, sin título, año ni portada, que vienen de IGDB.
 * Guardar sin tocar nada deja el juego sin copias y en Backlog, como el alta de un toque.
 */
export function IgdbAddDialog({
  open,
  onOpenChange,
  title,
  stores,
  statusGroups,
  pending,
  errorMessage,
  onSave,
}: IgdbAddDialogProps) {
  const t = useTranslations();
  const entry = useEntryForm(statusGroups);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("add.igdbDialog.title", { title })}
      description={t("add.igdbDialog.description")}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => entry.submit(onSave)}>
            {t("add.form.save")}
          </button>
        </>
      }
    >
      <CopyRowsEditor
        stores={stores}
        rows={entry.copyRows.rows}
        onAdd={entry.copyRows.add}
        onChange={entry.copyRows.update}
        onRemove={entry.copyRows.remove}
      />
      <label className={controls.field}>
        {t("add.form.status")}
        <StatusSelect
          className={controls.select}
          groups={statusGroups}
          value={entry.statusId}
          onChange={entry.setStatusId}
        />
      </label>
      <EntryStatusExtras
        completed={entry.completed}
        hundredPercent={entry.hundredPercent}
        onHundredPercentChange={entry.setHundredPercent}
        confirmingEndless={entry.confirmingEndless}
        endlessChange={entry.endlessChange}
        pending={pending}
        errorMessage={errorMessage}
        onCancelEndless={entry.cancelEndless}
        onAcceptEndless={() => entry.acceptEndless(onSave)}
      />
      <label className={controls.field}>
        {t("add.form.played")}
        <input
          className={`${controls.input} ${controls.number}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder={t("common.optional")}
          value={entry.playedHours}
          onChange={(event) => entry.setPlayedHours(event.target.value)}
        />
      </label>
      <ScoreInput value={entry.score} onChange={entry.setScore} />
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
