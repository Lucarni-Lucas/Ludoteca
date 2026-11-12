"use client";

import { useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import type { Store } from "@/model/store/store";

import { type CopyRowDraft, CopyRowFields, EMPTY_COPY_ROW, toCopyRowValues } from "./CopyRowFields";

export type NewCopyValues = CopyRowDraft & Readonly<{ acquiredOn: string }>;

type CopyDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: readonly Store[];
  pending: boolean;
  errorMessage: string | null;
  onSave: (values: NewCopyValues) => void;
}>;

export function CopyDialog({ open, onOpenChange, stores, pending, errorMessage, onSave }: CopyDialogProps) {
  const [row, setRow] = useState<CopyRowDraft>(EMPTY_COPY_ROW);
  const [acquiredOn, setAcquiredOn] = useState("");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar copia"
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={controls.primary}
            disabled={pending}
            onClick={() => onSave({ ...toCopyRowValues(row), acquiredOn })}
          >
            Guardar copia
          </button>
        </>
      }
    >
      <CopyRowFields stores={stores} value={row} onChange={(changes) => setRow((current) => ({ ...current, ...changes }))} />
      <label className={controls.field}>
        Cuándo lo conseguiste (opcional)
        <input
          className={controls.input}
          type="date"
          value={acquiredOn}
          onChange={(event) => setAcquiredOn(event.target.value)}
        />
      </label>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
