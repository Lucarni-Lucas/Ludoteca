"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, type RefObject, useEffect, useId, useRef, useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { useDateFormat } from "@/i18n/dates";
import type { ImportSource } from "@/model/import/import-row";

import styles from "./ImportSources.module.css";

export type SourceSummaryView = Readonly<{ itemCount: number; lastReadOn: string }>;

export type SourceFeedbackView = Readonly<{ kind: "ok" | "error"; message: string }>;

type FileSource = Exclude<ImportSource, "steam">;

export type ImportSourcesProps = Readonly<{
  summaries: Partial<Record<ImportSource, SourceSummaryView>>;
  feedback: Partial<Record<ImportSource, SourceFeedbackView>>;
  busy: ImportSource | null;
  steamAccountId: string | null;
  steamConfigured: boolean;
  steamMissingMessage: string;
  /** La fuente que pidió `?source=`: recibe el foco al abrir la pantalla. */
  focusSource?: ImportSource;
  /** La guía «¿Cómo lo saco?» de cada fuente de archivo (design.md §17). */
  guideHrefs?: Partial<Record<FileSource, string>>;
  onUpload: (source: FileSource, file: File) => void;
  onConnectSteam: (profile: string) => void;
  onRefreshSteam: () => void;
}>;

/** Lleva el foco a la fuente que pidió `?source=`, una sola vez al abrir la pantalla. */
function useFocusWhen<T extends HTMLElement>(focused: boolean): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (focused) {
      ref.current?.focus();
    }
  }, [focused]);

  return ref;
}

function Feedback({ value }: Readonly<{ value: SourceFeedbackView | undefined }>) {
  // Siempre montado: un role="status" que aparece con su texto no siempre se anuncia.
  return (
    <p role="status" className={value ? styles[value.kind] : styles.silent}>
      {value?.message}
    </p>
  );
}

/** En el celu, la fila de la fuente dice lo leído en lugar de qué trae (design.md §15). */
function SourceHeading({ source, narrowSummary }: Readonly<{ source: ImportSource; narrowSummary: string | null }>) {
  const t = useTranslations(`import.sources.${source}`);

  return (
    <div className={styles.heading}>
      <span aria-hidden="true" className={styles.code}>
        {t("code")}
      </span>
      <div className={styles.headingText}>
        <h3 className={styles.name}>{t("name")}</h3>
        <p className={styles.detail}>
          <span className={styles.dot} />
          <span className={narrowSummary ? styles.wideOnly : undefined}>{t("detail")}</span>
          {narrowSummary ? <span className={styles.narrowOnly}>{narrowSummary}</span> : null}
        </p>
      </div>
    </div>
  );
}

function SummaryLine({ summary, fetched }: Readonly<{ summary: SourceSummaryView | undefined; fetched?: boolean }>) {
  const t = useTranslations("import.sources");
  const { dayMonth } = useDateFormat();

  if (!summary) {
    return <p className={styles.notLoaded}>{t("notLoaded")}</p>;
  }

  const date = dayMonth(summary.lastReadOn);

  return (
    <div className={`${styles.summary} ${styles.wideOnly}`}>
      <span className={styles.count}>{t("games", { count: summary.itemCount })}</span>
      <span className={styles.when}>{fetched ? t("fetchedOn", { date }) : t("readOn", { date })}</span>
    </div>
  );
}

function useNarrowSummary(summary: SourceSummaryView | undefined, fetched = false): string | null {
  const t = useTranslations("import.sources");
  const { dayMonth } = useDateFormat();

  if (!summary) {
    return null;
  }

  const values = { count: summary.itemCount, date: dayMonth(summary.lastReadOn) };
  return fetched ? t("summaryFetched", values) : t("summaryRead", values);
}

type FileCardProps = Readonly<{
  source: FileSource;
  summary: SourceSummaryView | undefined;
  feedback: SourceFeedbackView | undefined;
  busy: boolean;
  focused: boolean;
  guideHref: string | undefined;
  onUpload: (source: FileSource, file: File) => void;
}>;

function FileSourceCard({ source, summary, feedback, busy, focused, guideHref, onUpload }: FileCardProps) {
  const t = useTranslations("import.sources");
  const name = useTranslations(`import.sources.${source}`)("name");
  const input = useRef<HTMLInputElement>(null);
  const button = useFocusWhen<HTMLButtonElement>(focused);
  const narrowSummary = useNarrowSummary(summary);

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Se limpia para que volver a elegir el mismo archivo también lo suba.
    event.target.value = "";

    if (file) {
      onUpload(source, file);
    }
  }

  const label = summary ? t("uploadAnother") : t("upload");

  return (
    <article className={styles.card} aria-label={name}>
      <SourceHeading source={source} narrowSummary={narrowSummary} />
      <SummaryLine summary={summary} />
      <div className={styles.fileActions}>
        <button
          ref={button}
          type="button"
          className={controls.secondary}
          disabled={busy}
          aria-label={busy ? t("uploading") : label}
          onClick={() => input.current?.click()}
        >
          {busy ? t("uploading") : <ButtonLabel wide={label} narrow={summary ? t("uploadAnotherShort") : label} />}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          className={controls.visuallyHidden}
          tabIndex={-1}
          aria-label={`${label} · ${name}`}
          onChange={onChange}
        />
        {guideHref ? (
          <Link href={guideHref} className={styles.guide} aria-label={t("howToLabel", { source: name })}>
            {t("howTo")}
          </Link>
        ) : null}
      </div>
      <Feedback value={feedback} />
    </article>
  );
}

/** El celu usa un rótulo más corto («Subir otro»); el nombre accesible es siempre el largo. */
function ButtonLabel({ wide, narrow }: Readonly<{ wide: string; narrow: string }>) {
  return (
    <>
      <span className={styles.wideOnly}>{wide}</span>
      <span className={styles.narrowOnly}>{narrow}</span>
    </>
  );
}

type SteamCardProps = Pick<
  ImportSourcesProps,
  "steamAccountId" | "steamConfigured" | "steamMissingMessage" | "onConnectSteam" | "onRefreshSteam"
> &
  Readonly<{ summary: SourceSummaryView | undefined; feedback: SourceFeedbackView | undefined; busy: boolean; focused: boolean }>;

function SteamSourceCard(props: SteamCardProps) {
  const t = useTranslations("import.sources.steam");
  const fieldId = useId();
  const [profile, setProfile] = useState("");
  const field = useFocusWhen<HTMLInputElement>(props.focused);
  const connected = props.steamAccountId !== null;
  const summaryLine = useNarrowSummary(connected ? props.summary : undefined, true);
  // Conectada y sin nada abierto (confirmó todo o empezó de nuevo): no hay cantidad que mostrar.
  const narrowSummary = connected && !props.summary ? t("accountConnected") : summaryLine;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onConnectSteam(profile);
  }

  return (
    <article className={styles.card} aria-label={t("name")}>
      <SourceHeading source="steam" narrowSummary={narrowSummary} />
      {connected && props.summary ? <SummaryLine summary={props.summary} fetched /> : null}
      {connected && !props.summary ? <p className={`${styles.summary} ${styles.wideOnly}`}>{t("accountConnected")}</p> : null}
      {!props.steamConfigured ? <p className={styles.error}>{props.steamMissingMessage}</p> : null}
      {connected ? (
        <div className={styles.actions}>
          <button type="button" className={controls.secondary} disabled={props.busy} onClick={props.onRefreshSteam}>
            {props.busy ? t("refreshing") : t("refresh")}
          </button>
        </div>
      ) : (
        <form className={styles.steamForm} onSubmit={onSubmit}>
          <label htmlFor={fieldId} className={controls.field}>
            {t("profileLabel")}
          </label>
          <div className={styles.steamRow}>
            <input
              ref={field}
              id={fieldId}
              className={controls.input}
              value={profile}
              placeholder={t("profilePlaceholder")}
              disabled={!props.steamConfigured}
              onChange={(event) => setProfile(event.target.value)}
            />
            <button type="submit" className={controls.primary} disabled={props.busy || !props.steamConfigured || profile.trim() === ""}>
              {props.busy ? t("connecting") : t("connect")}
            </button>
          </div>
        </form>
      )}
      <Feedback value={props.feedback} />
    </article>
  );
}

/** Las tres fuentes, como las tarjetas de Tiendas (design.md §15). */
export function ImportSources(props: ImportSourcesProps) {
  const t = useTranslations("import.sources");

  return (
    <section className={styles.section} aria-labelledby="import-sources">
      <h2 id="import-sources" className={styles.title}>
        {t("title")}
      </h2>
      <div className={styles.grid}>
        {(["ign", "playnite"] as const).map((source) => (
          <FileSourceCard
            key={source}
            source={source}
            summary={props.summaries[source]}
            feedback={props.feedback[source]}
            busy={props.busy === source}
            focused={props.focusSource === source}
            guideHref={props.guideHrefs?.[source]}
            onUpload={props.onUpload}
          />
        ))}
        <SteamSourceCard
          summary={props.summaries.steam}
          feedback={props.feedback.steam}
          busy={props.busy === "steam"}
          focused={props.focusSource === "steam"}
          steamAccountId={props.steamAccountId}
          steamConfigured={props.steamConfigured}
          steamMissingMessage={props.steamMissingMessage}
          onConnectSteam={props.onConnectSteam}
          onRefreshSteam={props.onRefreshSteam}
        />
      </div>
      <p className={`${styles.note} ${styles.wideOnly}`}>{t("note")}</p>
    </section>
  );
}
