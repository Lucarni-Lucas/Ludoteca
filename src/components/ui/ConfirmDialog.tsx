"use client";

import { useTranslations } from "next-intl";

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
  /** Quitar algo va en el color de borrar; aceptar un aviso, en el de la acción principal. */
  tone?: "danger" | "primary";
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
  tone = "danger",
}: ConfirmDialogProps) {
  const t = useTranslations("common");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </button>
          <button type="button" className={tone === "danger" ? controls.danger : controls.primary} disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
