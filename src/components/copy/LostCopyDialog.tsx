"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { LOST_REASONS, type LostReason } from "@/model/copy/copy";

import { useCopyText } from "./copy-text";

type LostCopyDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  pending: boolean;
  errorMessage: string | null;
  onSave: (reason: LostReason, lostAt: string) => void;
}>;

export function LostCopyDialog({ open, onOpenChange, storeName, pending, errorMessage, onSave }: LostCopyDialogProps) {
  const t = useTranslations();
  const copyText = useCopyText();
  const [reason, setReason] = useState<LostReason>("other");
  const [lostAt, setLostAt] = useState("");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("copy.lostDialog.title")}
      description={t("copy.lostDialog.description", { store: storeName })}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => onSave(reason, lostAt)}>
            {t("common.save")}
          </button>
        </>
      }
    >
      <label className={controls.field}>
        {t("copy.lostDialog.reason")}
        <select
          className={controls.select}
          value={reason}
          onChange={(event) => setReason(event.target.value as LostReason)}
        >
          {LOST_REASONS.map((option) => (
            <option key={option} value={option}>
              {copyText.lostReason(option)}
            </option>
          ))}
        </select>
      </label>
      <label className={controls.field}>
        {t("copy.lostDialog.date")}
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
