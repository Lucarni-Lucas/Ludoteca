"use client";

import Link from "next/link";
import { type FormEvent, useId, useState } from "react";

import { CopyRowsEditor } from "@/components/copy/CopyRowsEditor";
import { StatusSelect } from "@/components/status/StatusSelect";
import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { type EntryValues, useEntryForm } from "@/hooks/use-entry-form";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

import { CoverField } from "./CoverField";
import styles from "./ManualGameForm.module.css";
import { ScoreInput } from "./ScoreInput";

export type ManualGameValues = EntryValues &
  Readonly<{
    title: string;
    coverUrl: string;
    pageUrl: string;
    year: string;
    estimatedHours: string;
  }>;

type ManualGameFormProps = Readonly<{
  stores: readonly Store[];
  statusGroups: readonly StatusGroupView[];
  pending: boolean;
  errorMessage: string | null;
  uploading: boolean;
  uploadError: string | null;
  onUploadCover: (file: File) => Promise<string | undefined>;
  onSubmit: (values: ManualGameValues) => void;
}>;

export function ManualGameForm({
  stores,
  statusGroups,
  pending,
  errorMessage,
  uploading,
  uploadError,
  onUploadCover,
  onSubmit,
}: ManualGameFormProps) {
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [year, setYear] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const entry = useEntryForm();
  const yearId = useId();
  const durationId = useId();

  async function handleUpload(file: File): Promise<void> {
    const url = await onUploadCover(file);

    if (url) {
      setCoverUrl(url);
    }
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit({ title, coverUrl, pageUrl, year, estimatedHours, ...entry.values() });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <CoverField
        title={title}
        coverUrl={coverUrl}
        uploading={uploading}
        uploadError={uploadError}
        onCoverUrlChange={setCoverUrl}
        onUpload={(file) => void handleUpload(file)}
      />

      <label className={controls.field}>
        Título
        <input
          className={`${controls.input} ${controls.inputTitle}`}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className={controls.field}>
        Link a la página del juego
        <input
          className={controls.input}
          type="url"
          placeholder="opcional"
          value={pageUrl}
          onChange={(event) => setPageUrl(event.target.value)}
        />
      </label>

      <CopyRowsEditor
        stores={stores}
        rows={entry.copyRows.rows}
        onAdd={entry.copyRows.add}
        onChange={entry.copyRows.update}
        onRemove={entry.copyRows.remove}
      />

      <div className={styles.threeColumns}>
        <div className={controls.field}>
          <span className={controls.labelWithHelp}>
            <label htmlFor={yearId}>Año de lanzamiento</label>
            <HelpTip help={HELP.releaseYear} />
          </span>
          <input
            id={yearId}
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="numeric"
            placeholder="opcional"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </div>
        <div className={controls.field}>
          <span className={controls.labelWithHelp}>
            <label htmlFor={durationId}>Duración (h)</label>
            <HelpTip help={HELP.duration} />
          </span>
          <input
            id={durationId}
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="opcional"
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(event.target.value)}
          />
        </div>
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
        <label className={`${controls.field} ${styles.status}`}>
          Estado
          <StatusSelect
            className={controls.select}
            groups={statusGroups}
            value={entry.statusId}
            onChange={entry.setStatusId}
          />
        </label>
      </div>

      <ScoreInput value={entry.score} onChange={entry.setScore} />

      <p className={controls.hint}>
        Queda marcado como «agregado a mano». Si algún día aparece en IGDB, lo podés vincular sin perder tu puntaje ni
        tu historial.
      </p>

      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}

      <div className={styles.actions}>
        <Link href="/library" className={`${controls.secondary} ${styles.action}`}>
          Cancelar
        </Link>
        <button type="submit" className={`${controls.primary} ${styles.action} ${styles.submit}`} disabled={pending}>
          Guardar juego
        </button>
      </div>
    </form>
  );
}
