"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";

import { useCopyText } from "@/components/copy/copy-text";
import { GameCover } from "@/components/game/GameCover";
import controls from "@/components/ui/controls.module.css";
import { COPY_KINDS } from "@/model/copy/copy";
import { keptCopies } from "@/model/import/copies";
import type { ReviewChoice, ReviewGame } from "@/model/import/review";

import { useImportText } from "./import-text";
import styles from "./ReviewRow.module.css";

export type StatusOption = Readonly<{ statusKey: string; name: string }>;

/** Las opciones que solo abren un campo: no deciden nada todavía. */
type Opening = "search" | "other_status" | "other_kind" | null;

type ReviewRowProps = Readonly<{
  game: ReviewGame;
  selected: boolean;
  disabled: boolean;
  statuses: readonly StatusOption[];
  onToggle: () => void;
  onChoose: (choice: ReviewChoice) => void;
  onReset: () => void;
  renderSearch: (game: ReviewGame, close: () => void) => ReactNode;
}>;

function sameChoice(a: ReviewChoice | null, b: ReviewChoice): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

function Check({ checked }: Readonly<{ checked: boolean }>) {
  return (
    <span className={checked ? `${styles.box} ${styles.boxChecked}` : styles.box}>
      {checked ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 5 5 9-10" />
        </svg>
      ) : null}
    </span>
  );
}

export function SelectToggle({ label, checked, onToggle }: Readonly<{ label: string; checked: boolean; onToggle: () => void }>) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={styles.toggle} onClick={onToggle}>
      <Check checked={checked} />
    </button>
  );
}

function isDiscard(choice: ReviewChoice): boolean {
  return choice.kind === "exclude" || choice.kind === "exclude_copy";
}

type PickerProps = Readonly<{
  label: string;
  options: readonly Readonly<{ value: string; label: string }>[];
  initial: string;
  disabled: boolean;
  onApply: (value: string) => void;
}>;

/** Un selector con «Aplicar»: «Otro estado», «Otro tipo» y el estado de «Elegí un estado». */
function Picker({ label, options, initial, disabled, onApply }: PickerProps) {
  const t = useTranslations("import.review");
  const id = useId();
  const [value, setValue] = useState(initial);

  return (
    <div className={styles.picker}>
      <label htmlFor={id} className={controls.visuallyHidden}>
        {label}
      </label>
      <select id={id} className={controls.select} value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="button" className={controls.secondary} disabled={disabled} onClick={() => onApply(value)}>
        {t("apply")}
      </button>
    </div>
  );
}

function Choices({ game, disabled, onPick }: Readonly<{ game: ReviewGame; disabled: boolean; onPick: (choice: ReviewChoice) => void }>) {
  const t = useTranslations("import.review");
  const text = useImportText();

  return (
    <div role="radiogroup" aria-label={t("optionsFor", { title: game.title })} className={styles.choices}>
      {game.choices.map((choice) => {
        const checked = sameChoice(game.marked, choice);
        const classes = [styles.radio, checked ? styles.radioChecked : "", isDiscard(choice) ? styles.discard : ""].filter(Boolean);

        return (
          <button
            key={JSON.stringify(choice)}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            className={classes.join(" ")}
            onClick={() => onPick(choice)}
          >
            <span aria-hidden="true" className={styles.dot} />
            {text.choice(choice)}
          </button>
        );
      })}
    </div>
  );
}

function Origins({ game }: Readonly<{ game: ReviewGame }>) {
  const t = useTranslations("import.review");
  const text = useImportText();
  const added = keptCopies(game.suggestion.copies).length;

  return (
    <>
      <div className={styles.chips}>
        {text.origins(game).map((chip) => (
          <span key={chip.label} className={chip.warning ? `${styles.chip} ${styles.chipWarning}` : styles.chip}>
            {chip.label}
          </span>
        ))}
      </div>
      {game.libraryGameId ? <p className={styles.note}>{t("inLibrary", { count: added })}</p> : null}
    </>
  );
}

/** Una fila por juego: su casilla de selección, de dónde vino y sus opciones con la sugerencia marcada. */
export function ReviewRow({ game, selected, disabled, statuses, onToggle, onChoose, onReset, renderSearch }: ReviewRowProps) {
  const t = useTranslations("import.review");
  const copyText = useCopyText();
  const [opening, setOpening] = useState<Opening>(null);
  const close = () => setOpening(null);
  const statusOptions = statuses.map(({ statusKey, name }) => ({ value: statusKey, label: name }));
  const kindOptions = COPY_KINDS.map((kind) => ({ value: kind, label: copyText.kind(kind) }));

  function onPick(choice: ReviewChoice) {
    if (choice.kind === "search" || choice.kind === "other_status" || choice.kind === "other_kind") {
      setOpening(choice.kind);
      return;
    }

    onChoose(choice);
  }

  const markedStatus = game.marked?.kind === "status" ? game.marked.statusKey : (statusOptions[0]?.value ?? "");

  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
        <GameCover title={game.title} coverUrl={game.coverUrl} variant="small" />
        <div className={styles.info}>
          <p className={styles.title}>
            <span>{game.title}</span> {game.year === null ? null : <span className={styles.year}>{game.year}</span>}
          </p>
          <Origins game={game} />
        </div>
      </div>
      <div className={styles.options}>
        {game.choices.length > 0 ? <Choices game={game} disabled={disabled} onPick={onPick} /> : null}
        {game.group === "status" ? (
          <Picker
            label={t("otherStatus", { title: game.title })}
            options={statusOptions}
            initial={markedStatus}
            disabled={disabled}
            onApply={(statusKey) => onChoose({ kind: "status", statusKey })}
          />
        ) : null}
        {game.group === "not_found" ? (
          <button type="button" className={controls.ghost} disabled={disabled} onClick={() => setOpening("search")}>
            {t("searchAgain")}
          </button>
        ) : null}
        {game.group === "ready" && game.decided ? (
          <button type="button" className={controls.ghost} disabled={disabled} onClick={onReset}>
            {t("backToReview")}
          </button>
        ) : null}
        {opening === "other_status" ? (
          <Picker
            label={t("otherStatus", { title: game.title })}
            options={statusOptions}
            initial={markedStatus}
            disabled={disabled}
            onApply={(statusKey) => onChoose({ kind: "status", statusKey })}
          />
        ) : null}
        {opening === "other_kind" ? (
          <Picker
            label={t("otherKind", { title: game.title })}
            options={kindOptions}
            initial={kindOptions[0].value}
            disabled={disabled}
            onApply={(value) => {
              const copyKind = COPY_KINDS.find((kind) => kind === value);
              if (copyKind) {
                onChoose({ kind: "copy_kind", copyKind });
              }
            }}
          />
        ) : null}
        {opening === "search" ? renderSearch(game, close) : null}
      </div>
    </li>
  );
}
