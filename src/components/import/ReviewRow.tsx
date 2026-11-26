"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

import { GameCover } from "@/components/game/GameCover";
import controls from "@/components/ui/controls.module.css";
import { keptCopies } from "@/model/import/copies";
import type { ImportCandidate } from "@/model/import/import-entry";
import { canGoBack, isQuestionGroup, type ReviewChoice, type ReviewGame, type StatusRef } from "@/model/import/review";
import { offeredStatuses } from "@/model/status/status";

import { useImportText } from "./import-text";
import styles from "./ReviewRow.module.css";

/** Un estado activo del usuario, con el nombre que se ve en el idioma elegido. */
export type StatusOption = StatusRef & Readonly<{ label: string }>;

export function statusChoiceOf({ id, name, systemKey }: StatusOption): ReviewChoice {
  return { kind: "status", status: { id, name, systemKey } };
}

/** Las respuestas que solo abren algo para elegir: no deciden nada todavía. */
type Opening = "search" | "other_status" | null;

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

type StatusListProps = Readonly<{
  label: string;
  statuses: readonly StatusOption[];
  disabled: boolean;
  onPick: (status: StatusOption) => void;
}>;

/** Lo que abre «Otro estado»: los estados que se le ofrecen al juego, ninguno marcado (design.md §9). */
export function StatusList({ label, statuses, disabled, onPick }: StatusListProps) {
  const t = useTranslations("import.review");

  return (
    <div role="group" aria-label={label} className={styles.statusList}>
      <p className={styles.statusListTitle}>{t("allStatuses")}</p>
      {statuses.map((status) => (
        <button key={status.id} type="button" className={styles.statusOption} disabled={disabled} onClick={() => onPick(status)}>
          {status.label}
        </button>
      ))}
    </div>
  );
}

type OptionButtonProps = Readonly<{
  label: string;
  discard?: boolean;
  expanded?: boolean;
  disabled: boolean;
  onClick: () => void;
}>;

/** Una respuesta: todas iguales y ninguna marcada; «No importar» en el color de quitar. */
function OptionButton({ label, discard = false, expanded, disabled, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      disabled={disabled}
      className={discard ? `${styles.option} ${styles.discard}` : styles.option}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** «Otro estado» abre y cierra la lista; las demás respuestas deciden al tocarlas. */
function Answers({ game, disabled, onChoose, opening, onOpen }: RowProps) {
  const t = useTranslations("import.review");
  const text = useImportText();
  const statusesOpen = opening === "other_status";

  function answer(choice: ReviewChoice) {
    if (choice.kind === "other_status") {
      onOpen(statusesOpen ? null : "other_status");
      return;
    }

    onChoose(choice);
  }

  return (
    <div role="group" aria-label={t("answersFor", { title: game.title })} className={styles.actions}>
      {game.choices.map((choice) => (
        <OptionButton
          key={JSON.stringify(choice)}
          label={text.choice(choice, game)}
          discard={choice.kind === "exclude"}
          expanded={choice.kind === "other_status" ? statusesOpen : undefined}
          disabled={disabled}
          onClick={() => answer(choice)}
        />
      ))}
    </div>
  );
}

function OtherStatuses({ game, statuses, disabled, opening, onChoose }: RowProps) {
  const t = useTranslations("import.review");

  return opening === "other_status" ? (
    <StatusList
      label={t("otherStatus", { title: game.title })}
      statuses={offeredStatuses(statuses, { endless: game.endless })}
      disabled={disabled}
      onPick={(status) => onChoose(statusChoiceOf(status))}
    />
  ) : null;
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

/** Devuelve el juego a su primera pregunta sin respuestas; solo si tiene alguna (design.md §9). */
function BackToReview({ game, disabled, onReset }: Pick<RowProps, "game" | "disabled" | "onReset">) {
  const t = useTranslations("import.review");

  return canGoBack(game) ? (
    <button type="button" className={`${controls.ghost} ${styles.backToReview}`} disabled={disabled} onClick={onReset}>
      {t("backToReview")}
    </button>
  ) : null;
}

function GameHeading({ game }: Readonly<{ game: ReviewGame }>) {
  return (
    <p className={styles.title}>
      <span>{game.title}</span> {game.year === null ? null : <span className={styles.year}>{game.year}</span>}
    </p>
  );
}

/** Un grupo de lote: casilla, portada, de dónde vino y debajo sus respuestas, ninguna marcada. */
function BatchRow(props: RowProps) {
  const { game, selected, onToggle } = props;
  const t = useTranslations("import.review");

  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
        <GameCover title={game.title} coverUrl={game.coverUrl} variant="small" />
        <div className={styles.info}>
          <GameHeading game={game} />
          <Origins game={game} />
        </div>
        <BackToReview {...props} />
      </div>
      {game.choices.length > 0 ? (
        <div className={styles.options}>
          <Answers {...props} />
          <OtherStatuses {...props} />
        </div>
      ) : null}
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
        <div role="group" aria-label={label} className={styles.actions}>
          <OptionButton label={t("choices.yes")} disabled={disabled} onClick={() => onChoose({ kind: "candidate", candidate })} />
          <OptionButton label={t("choices.searchNo")} disabled={disabled} onClick={() => onOpen("search")} />
          <OptionButton discard label={t("choices.exclude")} disabled={disabled} onClick={() => onChoose(EXCLUDE)} />
        </div>
      </>
    );
  }

  return (
    <>
      <div role="group" aria-label={label} className={styles.candidates}>
        {candidates.map((candidate) => (
          <button
            key={candidate.igdbId}
            type="button"
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
function HowLeftOptions({ game, disabled, onChoose, opening, onOpen }: RowProps) {
  const t = useTranslations("import");
  const text = useImportText();
  const answers = game.choices.filter((choice) => choice.kind === "status");
  const statusKeys = answers.flatMap(({ status }) => status.systemKey ?? []);

  return (
    <>
      <p className={styles.note}>{text.ignHas(statusKeys)}</p>
      <div role="group" aria-label={t("review.howLeftFor", { title: game.title })} className={styles.actions}>
        {answers.map((choice) => (
          <OptionButton key={choice.status.id} label={text.choice(choice, game)} disabled={disabled} onClick={() => onChoose(choice)} />
        ))}
        <OptionButton
          label={t("choices.otherStatus")}
          expanded={opening === "other_status"}
          disabled={disabled}
          onClick={() => onOpen(opening === "other_status" ? null : "other_status")}
        />
        <OptionButton discard label={t("choices.exclude")} disabled={disabled} onClick={() => onChoose(EXCLUDE)} />
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

/** Una pregunta de a un juego: cómo llegó y las respuestas debajo, sin ninguna marcada. */
function QuestionRow(props: RowProps) {
  const { game, selected, onToggle, opening, renderSearch, onOpen } = props;
  const t = useTranslations("import.review");

  return (
    <li className={styles.questionRow}>
      <div className={styles.arrivalLine}>
        <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
        <Arrivals game={game} />
        <BackToReview {...props} />
      </div>
      {game.group === "which" ? <WhichOptions {...props} /> : null}
      {game.group === "how_left" ? <HowLeftOptions {...props} /> : null}
      {game.group === "not_found" ? <NotFoundOptions {...props} /> : null}
      <OtherStatuses {...props} />
      {opening === "search" ? renderSearch(game, () => onOpen(null)) : null}
    </li>
  );
}

/** Lo que no se importa no tiene portada: un círculo tachado dice que no entra. */
function NonGameCover() {
  return (
    <span aria-hidden="true" className={styles.nonGameCover}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m5.6 5.6 12.8 12.8" />
      </svg>
    </span>
  );
}

/** «Listos para importar»: cómo va a entrar y, si lo decidió el usuario o el cruce, «Volver a revisar». */
/** «No se importa»: lo dejó afuera el usuario con «No importar», o el cruce porque no es un juego (design.md §9). */
function NotImportedInfo({ game }: Readonly<{ game: ReviewGame }>) {
  const t = useTranslations("import.review");

  return (
    <div className={styles.readyInfo}>
      <p className={`${styles.title} ${styles.muted}`}>{game.title}</p>
      <p className={`${styles.enters} ${styles.muted}`}>{game.nonGame ? t("notImported") : t("excludedEntry")}</p>
    </div>
  );
}

function ReadyRow({ game, selected, disabled, onToggle, onReset }: RowProps) {
  const t = useTranslations("import.review");
  const text = useImportText();

  return (
    <li className={styles.readyRow}>
      <SelectToggle label={t("select", { title: game.title })} checked={selected} onToggle={onToggle} />
      {game.excluded ? <NonGameCover /> : <GameCover title={game.title} coverUrl={game.coverUrl} variant="small" />}
      {game.excluded ? (
        <NotImportedInfo game={game} />
      ) : (
        <div className={styles.readyInfo}>
          <GameHeading game={game} />
          <p className={styles.enters}>{text.entersAs(game)}</p>
        </div>
      )}
      <BackToReview game={game} disabled={disabled} onReset={onReset} />
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
