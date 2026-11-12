"use client";

import { CopyRowsEditor } from "@/components/copy/CopyRowsEditor";
import { StatusSelect } from "@/components/status/StatusSelect";
import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { type EntryValues, useEntryForm } from "@/hooks/use-entry-form";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

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
 * Guardar sin tocar nada deja el juego sin copias y en «Quiero jugarlo», como el alta de un toque.
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
  const entry = useEntryForm();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Agregar «${title}»`}
      description="Título, año y portada vienen de IGDB."
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => onSave(entry.values())}>
            Guardar juego
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
        Estado
        <StatusSelect
          className={controls.select}
          groups={statusGroups}
          value={entry.statusId}
          onChange={entry.setStatusId}
        />
      </label>
      <label className={controls.field}>
        Horas jugadas
        <input
          className={`${controls.input} ${controls.number}`}
          type="number"
          inputMode="decimal"
          min="0"
          placeholder="opcional"
          value={entry.playedHours}
          onChange={(event) => entry.setPlayedHours(event.target.value)}
        />
      </label>
      <ScoreInput value={entry.score} onChange={entry.setScore} />
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
