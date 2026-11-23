"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import controls from "@/components/ui/controls.module.css";

import styles from "./CoverField.module.css";
import { GameCover } from "./GameCover";

export type CoverFieldProps = Readonly<{
  title: string;
  coverUrl: string;
  uploading: boolean;
  uploadError: string | null;
  onCoverUrlChange: (url: string) => void;
  onUpload: (file: File) => void;
}>;

export function CoverField({ title, coverUrl, uploading, uploadError, onCoverUrlChange, onUpload }: CoverFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);
  const t = useTranslations();

  return (
    <div className={styles.field}>
      <div className={styles.row}>
        <GameCover title={title} coverUrl={coverUrl === "" ? null : coverUrl} variant="form" />
        <div className={styles.controls}>
          <span className={styles.label}>{t("game.cover.label")}</span>
          <div className={styles.buttons}>
            <button
              type="button"
              className={controls.secondary}
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? t("game.cover.uploading") : t("game.cover.upload")}
            </button>
            <button type="button" className={controls.ghost} onClick={() => setPasting(true)}>
              {t("game.cover.paste")}
            </button>
          </div>
          <span className={styles.hint}>{t("game.cover.hint")}</span>
        </div>
      </div>
      {/* Se abre desde el botón: un input de archivo no se puede maquetar y queda fuera del foco. */}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={styles.file}
        aria-label={t("game.cover.file")}
        tabIndex={-1}
        onChange={(event) => {
          const [file] = event.target.files ?? [];

          if (file) {
            onUpload(file);
          }

          event.target.value = "";
        }}
      />
      {pasting ? (
        <label className={controls.field}>
          {t("game.cover.url")}
          <input
            className={controls.input}
            type="url"
            placeholder={t("common.optional")}
            value={coverUrl}
            onChange={(event) => onCoverUrlChange(event.target.value)}
          />
        </label>
      ) : null}
      {uploadError ? <p className={controls.error}>{uploadError}</p> : null}
    </div>
  );
}
