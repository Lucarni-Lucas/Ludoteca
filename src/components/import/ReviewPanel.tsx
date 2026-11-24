"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { useCopyText } from "@/components/copy/copy-text";
import controls from "@/components/ui/controls.module.css";
import { COPY_KINDS } from "@/model/copy/copy";
import type { ImportDecision } from "@/model/import/decision";
import type { ReviewChoice, ReviewGame, ReviewGroup } from "@/model/import/review";
import type { Store } from "@/model/store/store";

import { useImportText } from "./import-text";
import styles from "./ReviewPanel.module.css";
import { ReviewRow, SelectToggle, type StatusOption } from "./ReviewRow";

const PAGE_SIZE = 20;
// Las opciones que piden algo más que un toque no van en la barra de selección.
const ROW_ONLY: ReadonlySet<ReviewChoice["kind"]> = new Set(["candidate", "search", "other_status", "other_kind", "status"]);

export type ReviewPanelProps = Readonly<{
  group: ReviewGroup;
  games: readonly ReviewGame[];
  statuses: readonly StatusOption[];
  busy: boolean;
  steamConnected: boolean;
  errorMessage: string | null;
  /** Devuelve si se guardó: la línea de estado lo dice y el foco pasa a la fila siguiente. */
  onDecide: (entryIds: readonly string[], decision: ImportDecision) => Promise<boolean>;
  renderSearch: (game: ReviewGame, close: () => void) => ReactNode;
}>;

function batchChoices(games: readonly ReviewGame[]): readonly ReviewChoice[] {
  const [first] = games;
  return first ? first.choices.filter((choice) => !ROW_ONLY.has(choice.kind)) : [];
}

function storesOf(games: readonly ReviewGame[]): readonly Store[] {
  const stores = new Map<string, Store>();
  games.forEach((game) => game.suggestion.copies.forEach((copy) => stores.set(copy.store.id, copy.store)));
  return [...stores.values()];
}

type CopyKindFormProps = Readonly<{ stores: readonly Store[]; disabled: boolean; onApply: (storeId: string, kind: (typeof COPY_KINDS)[number]) => void }>;

/** «Tipo de copia»: cambia el tipo de las copias de una tienda en los juegos elegidos. */
function CopyKindForm({ stores, disabled, onApply }: CopyKindFormProps) {
  const t = useTranslations("import.review");
  const copyText = useCopyText();
  const storeId = useId();
  const kindId = useId();
  const [store, setStore] = useState(stores[0]?.id ?? "");
  const [kind, setKind] = useState<(typeof COPY_KINDS)[number]>("purchased");

  return (
    <div className={styles.copyKind}>
      <label htmlFor={storeId} className={controls.visuallyHidden}>
        {t("copyKind")}
      </label>
      <select id={storeId} className={controls.select} value={store} onChange={(event) => setStore(event.target.value)}>
        {stores.map((value) => (
          <option key={value.id} value={value.id}>
            {value.name}
          </option>
        ))}
      </select>
      <label htmlFor={kindId} className={controls.visuallyHidden}>
        {t("copyKindStore", { store: stores.find(({ id }) => id === store)?.name ?? "" })}
      </label>
      <select
        id={kindId}
        className={controls.select}
        value={kind}
        onChange={(event) => setKind(COPY_KINDS.find((value) => value === event.target.value) ?? "purchased")}
      >
        {COPY_KINDS.map((value) => (
          <option key={value} value={value}>
            {copyText.kind(value)}
          </option>
        ))}
      </select>
      <button type="button" className={controls.secondary} disabled={disabled || store === ""} onClick={() => onApply(store, kind)}>
        {t("apply")}
      </button>
    </div>
  );
}

type SelectionBarProps = Readonly<{
  group: ReviewGroup;
  selected: readonly ReviewGame[];
  disabled: boolean;
  onDecide: (decision: ImportDecision) => void;
  onCancel: () => void;
}>;

function SelectionBar({ group, selected, disabled, onDecide, onCancel }: SelectionBarProps) {
  const t = useTranslations("import.review");
  const text = useImportText();
  const [copyKindOpen, setCopyKindOpen] = useState(false);
  const stores = storesOf(selected);

  return (
    <div role="group" aria-label={t("selection")} className={styles.bar}>
      <span className={styles.barCount}>{t("selected", { count: selected.length })}</span>
      <div className={styles.barActions}>
        {group === "ready" ? (
          <button type="button" className={controls.secondary} disabled={disabled} onClick={() => onDecide({ kind: "reset" })}>
            {t("backToReview")}
          </button>
        ) : (
          <button type="button" className={controls.primary} disabled={disabled} onClick={() => onDecide({ kind: "accept" })}>
            {t("passToReady")}
          </button>
        )}
        {batchChoices(selected).map((choice) => (
          <button
            key={JSON.stringify(choice)}
            type="button"
            className={choice.kind === "exclude" || choice.kind === "exclude_copy" ? `${controls.secondary} ${styles.discard}` : controls.secondary}
            disabled={disabled}
            onClick={() => onDecide({ kind: "choose", choice })}
          >
            {text.choice(choice)}
          </button>
        ))}
        {stores.length > 0 ? (
          <button type="button" className={controls.secondary} aria-expanded={copyKindOpen} onClick={() => setCopyKindOpen((open) => !open)}>
            {t("copyKind")}
          </button>
        ) : null}
        <button type="button" className={controls.ghost} onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
      {copyKindOpen ? (
        <CopyKindForm stores={stores} disabled={disabled} onApply={(storeId, copyKind) => onDecide({ kind: "copy_kind", storeId, copyKind })} />
      ) : null}
    </div>
  );
}

function decidedMessage(
  games: readonly ReviewGame[],
  decision: ImportDecision,
  t: ReturnType<typeof useTranslations<"import.review">>,
  choiceText: (choice: ReviewChoice) => string,
): string {
  if (decision.kind === "reset") {
    return games.length === 1 ? t("movedBack", { title: games[0].title }) : t("movedManyToReady", { count: games.length });
  }

  const [game] = games;
  const choice = decision.kind === "choose" ? decision.choice : game.marked;

  if (games.length === 1 && choice) {
    return t("movedToReady", { title: game.title, choice: choiceText(choice) });
  }

  return t("movedManyToReady", { count: games.length });
}

/** El grupo elegido: la pregunta, por qué están ahí, la selección en lote y una fila por juego (design.md §9). */
export function ReviewPanel({ group, games, statuses, busy, steamConnected, errorMessage, onDecide, renderSearch }: ReviewPanelProps) {
  const t = useTranslations("import");
  const tReview = useTranslations("import.review");
  const text = useImportText();
  const headingId = useId();
  const list = useRef<HTMLUListElement>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState(PAGE_SIZE);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const pendingFocus = useRef<number | null>(null);
  const visible = games.slice(0, shown);
  const selected = games.filter((game) => selectedIds.has(game.entryId));
  const allSelected = games.length > 0 && selected.length === games.length;

  // La lista cambia bajo el dedo: el foco pasa a la fila que quedó en el lugar de la que se fue.
  useEffect(() => {
    const index = pendingFocus.current;

    if (index === null) {
      return;
    }

    pendingFocus.current = null;
    const rows = list.current?.querySelectorAll("li") ?? [];
    const row = rows[Math.min(index, rows.length - 1)];
    (row?.querySelector("button") ?? document.getElementById(headingId))?.focus();
  }, [games, statusLine, headingId]);

  function toggle(entryId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(entryId)) {
        next.add(entryId);
      }
      return next;
    });
  }

  async function decide(targets: readonly ReviewGame[], decision: ImportDecision) {
    const index = games.findIndex((game) => game.entryId === targets[0]?.entryId);
    const saved = await onDecide(
      targets.map((game) => game.entryId),
      decision,
    );

    if (saved) {
      setStatusLine(decidedMessage(targets, decision, tReview, text.choice));
      setSelectedIds(new Set());
      pendingFocus.current = Math.max(index, 0);
    }
  }

  const awaiting = group === "family" && !steamConnected;

  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <div>
        <h2 id={headingId} tabIndex={-1} className={styles.question}>
          {t(`groups.${group}.name`)}
        </h2>
        <p className={styles.explanation}>{t(`groups.${group}.explanation`)}</p>
        <p className={styles.rule}>{group === "ready" ? tReview("readyRule") : tReview("rule")}</p>
        {awaiting ? <p className={styles.awaiting}>{tReview("awaitingSteam")}</p> : null}
      </div>

      {selected.length > 0 ? (
        <SelectionBar
          group={group}
          selected={selected}
          disabled={busy}
          onDecide={(decision) => void decide(selected, decision)}
          onCancel={() => setSelectedIds(new Set())}
        />
      ) : null}

      <p role="status" className={statusLine ? styles.statusLine : styles.silent}>
        {statusLine ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12 5 5 9-10" />
          </svg>
        ) : null}
        {statusLine}
      </p>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}

      {games.length === 0 ? (
        <p className={styles.empty}>{tReview("empty")}</p>
      ) : (
        <div className={styles.list}>
          <div className={styles.selectAll}>
            <SelectToggle
              label={tReview("selectAll", { count: games.length })}
              checked={allSelected}
              onToggle={() => setSelectedIds(allSelected ? new Set() : new Set(games.map((game) => game.entryId)))}
            />
            <span aria-hidden="true">{tReview("selectAll", { count: games.length })}</span>
          </div>
          <ul ref={list} className={styles.rows}>
            {visible.map((game) => (
              <ReviewRow
                key={game.entryId}
                game={game}
                selected={selectedIds.has(game.entryId)}
                disabled={busy}
                statuses={statuses}
                onToggle={() => toggle(game.entryId)}
                onChoose={(choice) => void decide([game], { kind: "choose", choice })}
                onReset={() => void decide([game], { kind: "reset" })}
                renderSearch={renderSearch}
              />
            ))}
          </ul>
          {games.length > shown ? (
            <div className={styles.more}>
              <button type="button" className={controls.ghost} onClick={() => setShown((value) => value + PAGE_SIZE)}>
                {tReview("showMore", { count: Math.min(PAGE_SIZE, games.length - shown) })}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
