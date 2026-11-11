import controls from "@/components/ui/controls.module.css";
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
}>;

function durationText(game: LibraryGame): string {
  const source = durationSource(game);
  return source ? `${durationLabel(game)} · ${source}` : durationLabel(game);
}

function playedText(game: LibraryGame): string {
  return `${formatHours(playedHours(game))} h`;
}

/** En el celu estos datos van junto al título, y en PC en su propia sección: cada uno se muestra en su ancho. */
export function GameHeaderFacts({ game, onEdit }: GameFactsProps) {
  return (
    <div className={styles.headerFacts}>
      <p className={styles.played}>{playedText(game)} jugadas</p>
      <p className={styles.duration}>
        {durationText(game)}{" "}
        <button type="button" className={styles.edit} onClick={onEdit}>
          Editar
        </button>
      </p>
    </div>
  );
}

export function GameFacts({ game, onEdit }: GameFactsProps) {
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
        <dt className={styles.term}>Duración</dt>
        <dd className={styles.value}>
          {durationText(game)}{" "}
          <button type="button" className={styles.edit} onClick={onEdit}>
            Editar
          </button>
        </dd>
        <dt className={styles.term}>Jugaste</dt>
        <dd className={styles.value}>{playedText(game)}</dd>
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
