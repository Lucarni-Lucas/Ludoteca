"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations();
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
        {t("add.form.title")}
        <input
          className={`${controls.input} ${controls.inputTitle}`}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label className={controls.field}>
        {t("add.form.pageUrl")}
        <input
          className={controls.input}
          type="url"
          placeholder={t("common.optional")}
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
            <label htmlFor={yearId}>{t("add.form.year")}</label>
            <HelpTip help={HELP.releaseYear} />
          </span>
          <input
            id={yearId}
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="numeric"
            placeholder={t("common.optional")}
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </div>
        <div className={controls.field}>
          <span className={controls.labelWithHelp}>
            <label htmlFor={durationId}>{t("add.form.duration")}</label>
            <HelpTip help={HELP.duration} />
          </span>
          <input
            id={durationId}
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder={t("common.optional")}
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(event.target.value)}
          />
        </div>
        <label className={controls.field}>
          {t("add.form.played")}
          <input
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder={t("common.optional")}
            value={entry.playedHours}
            onChange={(event) => entry.setPlayedHours(event.target.value)}
          />
        </label>
        <label className={`${controls.field} ${styles.status}`}>
          {t("add.form.status")}
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
        {t("add.form.manualHint")}
      </p>

      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}

      <div className={styles.actions}>
        <Link href="/library" className={`${controls.secondary} ${styles.action}`}>
          {t("common.cancel")}
        </Link>
        <button type="submit" className={`${controls.primary} ${styles.action} ${styles.submit}`} disabled={pending}>
          {t("add.form.save")}
        </button>
      </div>
    </form>
  );
}
