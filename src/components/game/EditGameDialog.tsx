"use client";

import { useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { effectiveCover, effectiveEndless, formatHours, type LibraryGame } from "@/model/game/library-game";

import { CoverField } from "./CoverField";

export type EditGameValues = Readonly<{
  estimatedHours: string;
  endless: boolean;
  coverUrl: string;
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
      title="Editar"
      description="Tus cambios se ven solo en tu biblioteca. Dejá un campo vacío para usar el dato del catálogo."
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={controls.primary}
            disabled={pending}
            onClick={() => onSave({ estimatedHours, endless, coverUrl })}
          >
            Guardar cambios
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
      <Toggle label="Sin fin" help={HELP.endless} checked={endless} onCheckedChange={setEndless} />
      <label className={controls.field}>
        Duración (h)
        <input
          className={`${controls.input} ${controls.number}`}
          type="number"
          inputMode="decimal"
          min="0"
          disabled={endless}
          placeholder="opcional"
          value={endless ? "" : estimatedHours}
          onChange={(event) => setEstimatedHours(event.target.value)}
        />
      </label>
      {game.catalog.estimatedHours === null ? null : (
        <p className={controls.hint}>IGDB: unas {formatHours(game.catalog.estimatedHours)} h</p>
      )}
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
