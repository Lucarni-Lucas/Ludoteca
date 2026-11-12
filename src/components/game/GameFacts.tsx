import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { formatMonthYear } from "@/model/game/date-format";
import {
  durationLabel,
  durationSource,
  formatHours,
  type LibraryGame,
  playedHours,
} from "@/model/game/library-game";

import styles from "./GameFacts.module.css";

type GameFactsProps = Readonly<{
  game: LibraryGame;
  onEdit: () => void;
  /** Sin ella, las horas se muestran sin el botón para cambiarlas. */
  onEditPlayed?: () => void;
}>;

function durationText(game: LibraryGame): string {
  const source = durationSource(game);
  return source ? `${durationLabel(game)} · ${source}` : durationLabel(game);
}

function playedText(game: LibraryGame): string {
  return `${formatHours(playedHours(game))} h`;
}

function PlayedButton({ game, onEditPlayed }: Readonly<Pick<GameFactsProps, "game" | "onEditPlayed">>) {
  if (!onEditPlayed) {
    return null;
  }

  return (
    <button type="button" className={styles.edit} onClick={onEditPlayed}>
      {game.manualPlayedMinutes === null ? "Cargar horas" : "Cambiar horas"}
    </button>
  );
}

/** En el celu estos datos van junto al título, y en PC en su propia sección: cada uno se muestra en su ancho. */
export function GameHeaderFacts({ game, onEdit, onEditPlayed }: GameFactsProps) {
  return (
    <div className={styles.headerFacts}>
      <p className={styles.played}>
        {playedText(game)} jugadas <PlayedButton game={game} onEditPlayed={onEditPlayed} />
      </p>
      <p className={styles.duration}>
        {/* En el celu no hay un rótulo «Duración»: la ayuda va junto al dato. */}
        <span className={styles.withHelp}>
          {durationText(game)}
          <HelpTip help={HELP.duration} />
        </span>
        <button type="button" className={styles.edit} onClick={onEdit}>
          Editar
        </button>
      </p>
    </div>
  );
}

export function GameFacts({ game, onEdit, onEditPlayed }: GameFactsProps) {
  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>Datos</h2>
      <dl className={styles.list}>
        {game.developer ? (
          <>
            <dt className={styles.term}>Desarrollo</dt>
            <dd className={styles.value}>{game.developer}</dd>
          </>
        ) : null}
        <dt className={`${styles.term} ${styles.withHelp}`}>
          Duración
          <HelpTip help={HELP.duration} />
        </dt>
        <dd className={styles.value}>
          {durationText(game)}{" "}
          <button type="button" className={styles.edit} onClick={onEdit}>
            Editar
          </button>
        </dd>
        <dt className={styles.term}>Jugaste</dt>
        <dd className={styles.value}>
          {playedText(game)} <PlayedButton game={game} onEditPlayed={onEditPlayed} />
        </dd>
        <dt className={styles.term}>Agregado</dt>
        <dd className={styles.value}>{formatMonthYear(game.addedAt.slice(0, "AAAA-MM-DD".length))}</dd>
        {game.pageUrl ? (
          <>
            <dt className={styles.term}>Página</dt>
            <dd className={styles.value}>
              <a className={styles.link} href={game.pageUrl} target="_blank" rel="noreferrer">
                {game.source === "manual" ? "Abrir" : "IGDB"}
              </a>
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
