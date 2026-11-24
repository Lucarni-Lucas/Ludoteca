"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";

import { useCopyText } from "@/components/copy/copy-text";
import { GameCover } from "@/components/game/GameCover";
import controls from "@/components/ui/controls.module.css";
import { COPY_KINDS } from "@/model/copy/copy";
import { keptCopies } from "@/model/import/copies";
import type { ImportCandidate } from "@/model/import/import-entry";
import { isQuestionGroup, type ReviewChoice, type ReviewGame } from "@/model/import/review";

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

type RowProps = ReviewRowProps & Readonly<{ opening: Opening; onOpen: (opening: Opening) => void }>;

const EXCLUDE: ReviewChoice = { kind: "exclude" };

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

function StatusPicker({ game, statuses, disabled, onChoose }: Pick<RowProps, "game" | "statuses" | "disabled" | "onChoose">) {
  const t = useTranslations("import.review");
  const options = statuses.map(({ statusKey, name }) => ({ value: statusKey, label: name }));
  const marked = game.marked?.kind === "status" ? game.marked.statusKey : (options[0]?.value ?? "");

  return (
    <Picker
      label={t("otherStatus", { title: game.title })}
      options={options}
      initial={marked}
      disabled={disabled}
      onApply={(statusKey) => onChoose({ kind: "status", statusKey })}
    />
  );
}

type OptionButtonProps = Readonly<{
  label: string;
  discard?: boolean;
  /** Dentro de un `radiogroup` va como radio, sin marcar: en las preguntas no hay sugerencia. */
  radio?: boolean;
  disabled: boolean;
  onClick: () => void;
}>;

function OptionButton({ label, discard = false, radio = false, disabled, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      role={radio ? "radio" : undefined}
      aria-checked={radio ? false : undefined}
      disabled={disabled}
      className={discard ? `${styles.option} ${styles.discard}` : styles.option}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Las opciones de los grupos de lote, con la sugerencia marcada. */
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

function GameHeading({ game }: Readonly<{ game: ReviewGame }>) {
  return (
    <p className={styles.title}>
      <span>{game.title}</span> {game.year === null ? null : <span className={styles.year}>{game.year}</span>}
    </p>
  );
}

/** Un grupo de lote: casilla, portada, de dónde vino y las opciones con la sugerencia marcada. */
function BatchRow(props: RowProps) {
  const { game, selected, disabled, onToggle, onChoose, opening, onOpen } = props;
  const t = useTranslations("import.review");
  const copyText = useCopyText();
  const kindOptions = COPY_KINDS.map((kind) => ({ value: kind, label: copyText.kind(kind) }));

  function onPick(choice: ReviewChoice) {
    if (choice.kind === "other_status" || choice.kind === "other_kind") {
      onOpen(choice.kind);
      return;
    }

    onChoose(choice);
  }

  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
        <GameCover title={game.title} coverUrl={game.coverUrl} variant="small" />
        <div className={styles.info}>
          <GameHeading game={game} />
          <Origins game={game} />
        </div>
      </div>
      <div className={styles.options}>
        {game.choices.length > 0 ? <Choices game={game} disabled={disabled} onPick={onPick} /> : null}
        {game.group === "status" || opening === "other_status" ? <StatusPicker {...props} /> : null}
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
      </div>
    </li>
  );
}

function Candidate({ candidate }: Readonly<{ candidate: ImportCandidate }>) {
  return (
    <>
      <span aria-hidden="true" className={styles.candidateCover}>
        <GameCover title={candidate.title} coverUrl={candidate.coverUrl} variant="small" />
      </span>
      <span className={styles.candidateText}>
        <span className={styles.candidateTitle}>{candidate.title}</span>
        {candidate.year === null ? null : <span className={styles.candidateYear}>{candidate.year}</span>}
      </span>
    </>
  );
}

function candidatesOf(game: ReviewGame): readonly ImportCandidate[] {
  return game.choices.flatMap((choice) => (choice.kind === "candidate" ? [choice.candidate] : []));
}

/** «¿Cuál de estos es?»: una tarjeta por candidato, o «¿Es este juego?» si hay uno solo con otro nombre. */
function WhichOptions({ game, disabled, onChoose, onOpen }: RowProps) {
  const t = useTranslations("import");
  const candidates = candidatesOf(game);
  const label = t("review.whichFor", { title: game.title });

  if (game.isThisQuestion) {
    const [candidate] = candidates;

    return (
      <>
        <p className={styles.question}>{t("review.isThis")}</p>
        <div className={styles.candidateCard}>
          <Candidate candidate={candidate} />
        </div>
        <div role="radiogroup" aria-label={label} className={styles.actions}>
          <OptionButton radio label={t("choices.yes")} disabled={disabled} onClick={() => onChoose({ kind: "candidate", candidate })} />
          <OptionButton radio label={t("choices.searchNo")} disabled={disabled} onClick={() => onOpen("search")} />
          <OptionButton radio discard label={t("choices.exclude")} disabled={disabled} onClick={() => onChoose(EXCLUDE)} />
        </div>
      </>
    );
  }

  return (
    <>
      <div role="radiogroup" aria-label={label} className={styles.candidates}>
        {candidates.map((candidate) => (
          <button
            key={candidate.igdbId}
            type="button"
            role="radio"
            aria-checked={false}
            disabled={disabled}
            className={styles.candidate}
            onClick={() => onChoose({ kind: "candidate", candidate })}
          >
            <Candidate candidate={candidate} />
          </button>
        ))}
      </div>
      <div className={styles.actions}>
        <OptionButton label={t("choices.search")} disabled={disabled} onClick={() => onOpen("search")} />
        <OptionButton discard label={t("choices.exclude")} disabled={disabled} onClick={() => onChoose(EXCLUDE)} />
      </div>
    </>
  );
}

/** «¿Cómo lo dejaste?»: un botón por estado de IGN, dicho en palabras. */
function HowLeftOptions({ game, disabled, onChoose, onOpen }: RowProps) {
  const t = useTranslations("import");
  const text = useImportText();
  const statusKeys = game.choices.flatMap((choice) => (choice.kind === "status" ? [choice.statusKey] : []));

  return (
    <>
      <p className={styles.note}>{text.ignHas(statusKeys)}</p>
      <div role="radiogroup" aria-label={t("review.howLeftFor", { title: game.title })} className={styles.actions}>
        {statusKeys.map((statusKey) => (
          <OptionButton
            key={statusKey}
            radio
            label={text.howLeft(statusKey)}
            disabled={disabled}
            onClick={() => onChoose({ kind: "status", statusKey })}
          />
        ))}
        <OptionButton radio label={t("choices.otherStatus")} disabled={disabled} onClick={() => onOpen("other_status")} />
        <OptionButton radio discard label={t("choices.exclude")} disabled={disabled} onClick={() => onChoose(EXCLUDE)} />
      </div>
    </>
  );
}

function NotFoundOptions({ game, disabled, onChoose, onOpen }: RowProps) {
  const t = useTranslations("import");

  return (
    <>
      {game.nonGame ? <p className={styles.note}>{t("review.notGame")}</p> : null}
      <div className={styles.actions}>
        <OptionButton label={t("review.searchAgain")} disabled={disabled} onClick={() => onOpen("search")} />
        <OptionButton label={t("choices.manual")} disabled={disabled} onClick={() => onChoose({ kind: "manual" })} />
        <OptionButton discard label={t("choices.exclude")} disabled={disabled} onClick={() => onChoose(EXCLUDE)} />
      </div>
    </>
  );
}

/** Cómo llegó: «En IGN: Crash Bandicoot · 1996», una línea por fila de una fuente. */
function Arrivals({ game }: Readonly<{ game: ReviewGame }>) {
  const text = useImportText();

  return (
    <div className={styles.arrivals}>
      {game.origins.map((origin, index) => (
        <p key={`${origin.source}-${index}`} className={styles.arrival}>
          <span className={styles.arrivalSource}>{text.arrival(origin)}</span> <strong className={styles.arrivalTitle}>{origin.title}</strong>
          {origin.year === null ? null : <span className={styles.year}> · {origin.year}</span>}
        </p>
      ))}
    </div>
  );
}

/** Una pregunta de a un juego: cómo llegó y las opciones debajo, sin ninguna marcada. */
function QuestionRow(props: RowProps) {
  const { game, selected, onToggle, opening, renderSearch, onOpen } = props;
  const t = useTranslations("import.review");

  return (
    <li className={styles.questionRow}>
      <div className={styles.arrivalLine}>
        <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
        <Arrivals game={game} />
      </div>
      {game.group === "which" ? <WhichOptions {...props} /> : null}
      {game.group === "how_left" ? <HowLeftOptions {...props} /> : null}
      {game.group === "not_found" ? <NotFoundOptions {...props} /> : null}
      {opening === "other_status" ? <StatusPicker {...props} /> : null}
      {opening === "search" ? renderSearch(game, () => onOpen(null)) : null}
    </li>
  );
}

/** «Listos para importar»: cómo va a entrar y, si lo decidió el usuario, «Volver a revisar». */
function ReadyRow({ game, selected, disabled, onToggle, onReset }: RowProps) {
  const t = useTranslations("import.review");
  const text = useImportText();

  return (
    <li className={styles.readyRow}>
      <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
      <GameCover title={game.title} coverUrl={game.coverUrl} variant="small" />
      <div className={styles.readyInfo}>
        <GameHeading game={game} />
        <p className={styles.enters}>{text.entersAs(game)}</p>
      </div>
      {game.decided ? (
        <button type="button" className={controls.ghost} disabled={disabled} onClick={onReset}>
          {t("backToReview")}
        </button>
      ) : null}
    </li>
  );
}

/** Una fila por juego; cada clase de grupo pregunta distinto (design.md §9). */
export function ReviewRow(props: ReviewRowProps) {
  const [opening, setOpening] = useState<Opening>(null);
  const rowProps: RowProps = { ...props, opening, onOpen: setOpening };

  if (isQuestionGroup(props.game.group)) {
    return <QuestionRow {...rowProps} />;
  }

  return props.game.group === "ready" ? <ReadyRow {...rowProps} /> : <BatchRow {...rowProps} />;
}
