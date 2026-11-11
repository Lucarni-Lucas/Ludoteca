"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { CopyKindPicker } from "@/components/copy/CopyKindPicker";
import { OTHER_STORE, StoreSelect } from "@/components/copy/StoreSelect";
import { StatusSelect } from "@/components/status/StatusSelect";
import controls from "@/components/ui/controls.module.css";
import type { CopyKind } from "@/model/copy/copy";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

import { CoverField } from "./CoverField";
import styles from "./ManualGameForm.module.css";

export type ManualGameValues = Readonly<{
  title: string;
  coverUrl: string;
  pageUrl: string;
  storeId: string;
  otherStoreName: string;
  kind: CopyKind | null;
  familyOwner: string;
  year: string;
  estimatedHours: string;
  statusId: string;
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
  const [storeId, setStoreId] = useState("");
  const [otherStoreName, setOtherStoreName] = useState("");
  const [kind, setKind] = useState<CopyKind | null>(null);
  const [familyOwner, setFamilyOwner] = useState("");
  const [year, setYear] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [statusId, setStatusId] = useState("");

  async function handleUpload(file: File): Promise<void> {
    const url = await onUploadCover(file);

    if (url) {
      setCoverUrl(url);
    }
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit({
      title,
      coverUrl,
      pageUrl,
      storeId: storeId === OTHER_STORE ? "" : storeId,
      otherStoreName: storeId === OTHER_STORE ? otherStoreName : "",
      kind,
      familyOwner,
      year,
      estimatedHours,
      statusId,
    });
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

      <div className={styles.twoColumns}>
        <div className={styles.column}>
          <StoreSelect
            label="Dónde lo tenés"
            stores={stores}
            value={storeId}
            otherName={otherStoreName}
            onChange={setStoreId}
            onOtherNameChange={setOtherStoreName}
          />
        </div>
        <label className={controls.field}>
          Link a la página del juego
          <input
            className={controls.input}
            type="url"
            placeholder="https://…"
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
          />
        </label>
      </div>

      <CopyKindPicker value={kind} onChange={setKind} allowNone />

      {kind === "family" ? (
        <label className={controls.field}>
          De quién es
          <input
            className={controls.input}
            type="text"
            value={familyOwner}
            onChange={(event) => setFamilyOwner(event.target.value)}
          />
        </label>
      ) : null}

      <div className={styles.threeColumns}>
        <label className={controls.field}>
          Año
          <input
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          />
        </label>
        <label className={controls.field}>
          Duración (h)
          <input
            className={`${controls.input} ${controls.number}`}
            type="number"
            inputMode="decimal"
            min="0"
            placeholder="opcional"
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(event.target.value)}
          />
        </label>
        <label className={`${controls.field} ${styles.status}`}>
          Estado
          <StatusSelect className={controls.select} groups={statusGroups} value={statusId} onChange={setStatusId} />
        </label>
      </div>

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
