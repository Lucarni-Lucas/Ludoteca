"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { useCopyText } from "@/components/copy/copy-text";
import controls from "@/components/ui/controls.module.css";
import { COPY_KINDS } from "@/model/copy/copy";
import type { ImportDecision } from "@/model/import/decision";
import { canGoBack, type ImportReview, isQuestionGroup, type ReviewChoice, type ReviewGame, type ReviewGroup } from "@/model/import/review";
import type { Store } from "@/model/store/store";

import { useImportText } from "./import-text";
import styles from "./ReviewPanel.module.css";
import { ReviewRow, SelectToggle, type StatusOption, StatusList } from "./ReviewRow";

const PAGE_SIZE = 20;
// Elegir un candidato o buscar es de a un juego: no va en la barra de selección.
const ROW_ONLY: ReadonlySet<ReviewChoice["kind"]> = new Set(["candidate", "search"]);
const EXCLUDE: ReviewChoice = { kind: "exclude" };

export type ReviewPanelProps = Readonly<{
  group: ReviewGroup;
  games: readonly ReviewGame[];
  statuses: readonly StatusOption[];
  busy: boolean;
  steamConnected: boolean;
  errorMessage: string | null;
  /** Devuelve la revisión nueva, o `null` si no se guardó: el aviso lo dice y el foco pasa a la fila siguiente. */
  onDecide: (entryIds: readonly string[], decision: ImportDecision) => Promise<ImportReview | null>;
  /** El aviso flotante de la pantalla (design.md §15). */
  onNotify: (message: string) => void;
  renderSearch: (game: ReviewGame, close: () => void) => ReactNode;
}>;

/** La barra ofrece las respuestas del grupo; en las preguntas de a un juego, solo «No importar» (design.md §9). */
function batchChoices(group: ReviewGroup, games: readonly ReviewGame[]): readonly ReviewChoice[] {
  const [first] = games;

  if (!first) {
    return [];
  }

  return isQuestionGroup(group) ? [EXCLUDE] : first.choices.filter((choice) => !ROW_ONLY.has(choice.kind));
}

function storesOf(games: readonly ReviewGame[]): readonly Store[] {
  const stores = new Map<string, Store>();
  games.forEach((game) => game.suggestion.copies.forEach((copy) => stores.set(copy.store.id, copy.store)));
  return [...stores.values()];
}

type CopyKindFormProps = Readonly<{ stores: readonly Store[]; disabled: boolean; onApply: (storeId: string, kind: (typeof COPY_KINDS)[number]) => void }>;

/** «¿Cómo lo conseguiste?»: cambia el tipo de las copias de una tienda en los juegos elegidos. */
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
  statuses: readonly StatusOption[];
  disabled: boolean;
  onDecide: (decision: ImportDecision) => void;
  onCancel: () => void;
}>;

function SelectionBar({ group, selected, statuses, disabled, onDecide, onCancel }: SelectionBarProps) {
  const t = useTranslations("import.review");
  const text = useImportText();
  const [copyKindOpen, setCopyKindOpen] = useState(false);
  const [statusesOpen, setStatusesOpen] = useState(false);
  const stores = storesOf(selected);

  function onAnswer(choice: ReviewChoice) {
    if (choice.kind === "other_status") {
      setStatusesOpen((open) => !open);
      return;
    }

    onDecide({ kind: "choose", choice });
  }

  return (
    <div role="group" aria-label={t("selection")} className={styles.bar}>
      <span className={styles.barCount}>{t("selected", { count: selected.length })}</span>
      <div className={styles.barActions}>
        {selected.some(canGoBack) ? (
          <button type="button" className={controls.secondary} disabled={disabled} onClick={() => onDecide({ kind: "reset" })}>
            {t("backToReview")}
          </button>
        ) : null}
        {batchChoices(group, selected).map((choice) => (
          <button
            key={JSON.stringify(choice)}
            type="button"
            aria-expanded={choice.kind === "other_status" ? statusesOpen : undefined}
            className={choice.kind === "exclude" ? `${controls.secondary} ${styles.discard}` : controls.secondary}
            disabled={disabled}
            onClick={() => onAnswer(choice)}
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
      {statusesOpen ? (
        <StatusList
          label={t("otherStatusMany", { count: selected.length })}
          statuses={statuses}
          disabled={disabled}
          onPick={(statusKey) => onDecide({ kind: "choose", choice: { kind: "status", statusKey } })}
        />
      ) : null}
      {copyKindOpen ? (
        <CopyKindForm stores={stores} disabled={disabled} onApply={(storeId, copyKind) => onDecide({ kind: "copy_kind", storeId, copyKind })} />
      ) : null}
    </div>
  );
}

type MessageText = Readonly<{
  t: ReturnType<typeof useTranslations<"import.review">>;
  result: (choice: ReviewChoice, game: ReviewGame) => string;
  groupName: (group: ReviewGroup) => string;
  list: (parts: readonly string[]) => string;
}>;

/** Dónde quedó un juego después de «Volver a revisar»: se lo busca por sus filas, que no cambian. */
function findByItem(review: ImportReview, itemId: string | undefined): ReviewGame | undefined {
  return review.groups.flatMap((view) => view.games).find((game) => itemId !== undefined && game.itemIds.includes(itemId));
}

function resetMessage(games: readonly ReviewGame[], next: ImportReview, text: MessageText): string {
  const back = games.length === 1 ? findByItem(next, games[0].itemIds[0]) : undefined;
  return back
    ? text.t("movedBack", { title: back.title, group: text.groupName(back.group) })
    : text.t("movedManyBack", { count: games.length });
}

/** Adónde fue cada juego después de la respuesta: se lo busca por sus filas en la revisión nueva. */
function destinationsOf(games: readonly ReviewGame[], next: ImportReview): readonly ReviewGroup[] {
  return games.flatMap((game) => findByItem(next, game.itemIds[0])?.group ?? []);
}

function singleMessage(game: ReviewGame, choice: ReviewChoice | null, destination: ReviewGroup | undefined, text: MessageText): string {
  if (destination === game.group) {
    return text.t("stayed", { title: game.title, group: text.groupName(destination) });
  }

  if (destination !== undefined && destination !== "ready") {
    return text.t("movedTo", { title: game.title, group: text.groupName(destination) });
  }

  // Dice cómo va a entrar, no el texto del botón: después de «No», «Sin interés» (design.md §9).
  return choice
    ? text.t("movedToReady", { title: game.title, choice: text.result(choice, game) })
    : text.t("movedManyToReady", { count: 1 });
}

/** En lote: si todos fueron al mismo grupo lo dice así; si no, cuántos fueron a cada uno (design.md §9). */
function manyMessage(count: number, destinations: readonly ReviewGroup[], text: MessageText): string {
  const byGroup = Map.groupBy(destinations, (group) => group);

  if (byGroup.size > 1) {
    const parts = [...byGroup].map(([group, games]) => text.t("movedPart", { count: games.length, group: text.groupName(group) }));
    return text.t("movedManySplit", { count, list: text.list(parts) });
  }

  const [only] = byGroup.keys();
  return only === undefined || only === "ready"
    ? text.t("movedManyToReady", { count })
    : text.t("movedManyTo", { count, group: text.groupName(only) });
}

function decidedMessage(games: readonly ReviewGame[], decision: ImportDecision, next: ImportReview, text: MessageText): string {
  if (decision.kind === "reset") {
    return resetMessage(games, next, text);
  }

  const [game] = games;
  const choice = decision.kind === "choose" ? decision.choice : null;

  if (choice?.kind === "exclude") {
    return games.length === 1 ? text.t("excluded", { title: game.title }) : text.t("excludedMany", { count: games.length });
  }

  const destinations = destinationsOf(games, next);
  return games.length === 1 ? singleMessage(game, choice, destinations[0], text) : manyMessage(games.length, destinations, text);
}

/** El grupo elegido: la pregunta, por qué están ahí, la selección en lote y una fila por juego (design.md §9). */
export function ReviewPanel({
  group,
  games,
  statuses,
  busy,
  steamConnected,
  errorMessage,
  onDecide,
  onNotify,
  renderSearch,
}: ReviewPanelProps) {
  const t = useTranslations("import");
  const tReview = useTranslations("import.review");
  const text = useImportText();
  const headingId = useId();
  const list = useRef<HTMLUListElement>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [shown, setShown] = useState(PAGE_SIZE);
  // Cambia con cada decisión guardada: el efecto de foco corre aunque la lista quede igual.
  const [decisions, setDecisions] = useState(0);
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
  }, [games, decisions, headingId]);

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
    const next = await onDecide(
      targets.map((game) => game.entryId),
      decision,
    );

    if (next) {
      onNotify(decidedMessage(targets, decision, next, { t: tReview, result: text.result, groupName: text.groupName, list: text.list }));
      setSelectedIds(new Set());
      setDecisions((count) => count + 1);
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
        {isQuestionGroup(group) ? null : <p className={styles.rule}>{group === "ready" ? tReview("readyRule") : tReview("rule")}</p>}
        {awaiting ? <p className={styles.awaiting}>{tReview("awaitingSteam")}</p> : null}
      </div>

      {selected.length > 0 ? (
        <SelectionBar
          group={group}
          selected={selected}
          statuses={statuses}
          disabled={busy}
          onDecide={(decision) => void decide(selected, decision)}
          onCancel={() => setSelectedIds(new Set())}
        />
      ) : null}

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
