"use client";

import { useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { LOST_REASON_LABELS, LOST_REASONS, type LostReason } from "@/model/copy/copy";

type LostCopyDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  pending: boolean;
  errorMessage: string | null;
  onSave: (reason: LostReason, lostAt: string) => void;
}>;

export function LostCopyDialog({ open, onOpenChange, storeName, pending, errorMessage, onSave }: LostCopyDialogProps) {
  const [reason, setReason] = useState<LostReason>("other");
  const [lostAt, setLostAt] = useState("");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Ya no lo tengo"
      description={`La copia de ${storeName} queda en el historial con su tipo y su fecha.`}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => onSave(reason, lostAt)}>
            Guardar
          </button>
        </>
      }
    >
      <label className={controls.field}>
        Motivo
        <select
          className={controls.select}
          value={reason}
          onChange={(event) => setReason(event.target.value as LostReason)}
        >
          {LOST_REASONS.map((option) => (
            <option key={option} value={option}>
              {LOST_REASON_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
      <label className={controls.field}>
        Fecha (si no la ponés, usamos la de hoy)
        <input
          className={controls.input}
          type="date"
          value={lostAt}
          onChange={(event) => setLostAt(event.target.value)}
        />
      </label>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
