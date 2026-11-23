"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { formatHours } from "@/model/game/library-game";

const MINUTES_PER_HOUR = 60;

type PlayedHoursDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualPlayedMinutes: number | null;
  pending: boolean;
  errorMessage: string | null;
  /** `null` borra el total a mano. */
  onSave: (hours: number | null) => void;
}>;

/** Lo escrito como número; vacío es borrar. El rango lo valida el servidor, con el mensaje de la spec. */
function toHours(text: string): number | null {
  return text.trim() === "" ? null : Number(text.trim().replace(",", "."));
}

/** Una ventana y no un campo suelto, como «Editar»: un total no debería guardarse a medio escribir. */
export function PlayedHoursDialog({
  open,
  onOpenChange,
  manualPlayedMinutes,
  pending,
  errorMessage,
  onSave,
}: PlayedHoursDialogProps) {
  const t = useTranslations();
  const [text, setText] = useState(
    manualPlayedMinutes === null ? "" : formatHours(manualPlayedMinutes / MINUTES_PER_HOUR),
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("game.playedDialog.title")}
      description={t("game.playedDialog.description")}
      footer={
        <>
          {manualPlayedMinutes === null ? null : (
            <button type="button" className={controls.ghost} disabled={pending} onClick={() => onSave(null)}>
              {t("game.playedDialog.clear")}
            </button>
          )}
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={() => onSave(toHours(text))}>
            {t("common.save")}
          </button>
        </>
      }
    >
      <label className={controls.field}>
        {t("game.playedDialog.field")}
        <input
          className={`${controls.input} ${controls.number}`}
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
