"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/Checkbox";
import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { effectiveCover, effectiveEndless, formatHours, type LibraryGame } from "@/model/game/library-game";
import { COMPLETED_KEY } from "@/model/status/status";

import { CoverField } from "./CoverField";

export type EditGameValues = Readonly<{
  estimatedHours: string;
  endless: boolean;
  coverUrl: string;
  /** Solo en «Completado»: fuera de ese estado la marca «100%» no existe (`04` design.md §22). */
  hundredPercent?: boolean;
}>;

type EditGameDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: LibraryGame;
  pending: boolean;
  errorMessage: string | null;
  uploading: boolean;
  uploadError: string | null;
  onUploadCover: (file: File) => Promise<string | undefined>;
  onSave: (values: EditGameValues) => void;
}>;

export function EditGameDialog({
  open,
  onOpenChange,
  game,
  pending,
  errorMessage,
  uploading,
  uploadError,
  onUploadCover,
  onSave,
}: EditGameDialogProps) {
  const [estimatedHours, setEstimatedHours] = useState(game.corrections.estimatedHours?.toString() ?? "");
  const [endless, setEndless] = useState(effectiveEndless(game));
  const [coverUrl, setCoverUrl] = useState(game.corrections.coverUrl ?? "");
  const completed = game.status.systemKey === COMPLETED_KEY;
  const [hundredPercent, setHundredPercent] = useState(game.hundredPercent ?? false);
  const durationId = useId();
  const t = useTranslations();

  async function handleUpload(file: File): Promise<void> {
    const url = await onUploadCover(file);

    if (url) {
      setCoverUrl(url);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("game.edit.title")}
      description={t("game.edit.description")}
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={controls.primary}
            disabled={pending}
            onClick={() => onSave({ estimatedHours, endless, coverUrl, ...(completed ? { hundredPercent } : {}) })}
          >
            {t("game.edit.save")}
          </button>
        </>
      }
    >
      <CoverField
        title={game.title}
        coverUrl={coverUrl === "" ? (effectiveCover(game) ?? "") : coverUrl}
        uploading={uploading}
        uploadError={uploadError}
        onCoverUrlChange={setCoverUrl}
        onUpload={(file) => void handleUpload(file)}
      />
      <Toggle label={t("game.edit.endless")} help={HELP.endless} checked={endless} onCheckedChange={setEndless} />
      {completed ? <Checkbox label={t("status.hundredPercent")} checked={hundredPercent} onCheckedChange={setHundredPercent} /> : null}
      <div className={controls.field}>
        <span className={controls.labelWithHelp}>
          <label htmlFor={durationId}>{t("game.edit.duration")}</label>
          <HelpTip help={HELP.duration} />
        </span>
        <input
          id={durationId}
          className={`${controls.input} ${controls.number}`}
          type="number"
          inputMode="decimal"
          min="0"
          disabled={endless}
          placeholder={t("common.optional")}
          value={endless ? "" : estimatedHours}
          onChange={(event) => setEstimatedHours(event.target.value)}
        />
      </div>
      {game.catalog.estimatedHours === null ? null : (
        <p className={controls.hint}>{t("game.edit.igdbHint", { hours: formatHours(game.catalog.estimatedHours) })}</p>
      )}
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
