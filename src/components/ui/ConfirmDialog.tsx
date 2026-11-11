"use client";

import controls from "./controls.module.css";
import { Modal } from "./Modal";

type ConfirmDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
}>;

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  errorMessage,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button type="button" className={controls.danger} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
