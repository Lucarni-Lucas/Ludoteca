import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { useDateFormat } from "@/i18n/dates";
import { durationInfo, durationSource, formatHours, type LibraryGame, playedHours } from "@/model/game/library-game";

import styles from "./GameFacts.module.css";

type GameFactsProps = Readonly<{
  game: LibraryGame;
  onEdit: () => void;
  /** Sin ella, las horas se muestran sin el botón para cambiarlas. */
  onEditPlayed?: () => void;
}>;

/** La duración en palabras del idioma elegido, con de dónde sale si se sabe. */
export function useDurationText() {
  const t = useTranslations("game.duration");

  return (game: LibraryGame): string => {
    const info = durationInfo(game);
    const duration = info.type === "hours" ? t("hours", { hours: formatHours(info.hours) }) : t(info.type);
    const source = durationSource(game);
    return source ? t("withSource", { duration, source: t(`sources.${source}`) }) : duration;
  };
}

function playedHoursText(game: LibraryGame): string {
  return formatHours(playedHours(game));
}

function PlayedButton({ game, onEditPlayed }: Readonly<Pick<GameFactsProps, "game" | "onEditPlayed">>) {
  const t = useTranslations("game.facts");

  if (!onEditPlayed) {
    return null;
  }

  return (
    <button type="button" className={styles.edit} onClick={onEditPlayed}>
      {game.manualPlayedMinutes === null ? t("loadHours") : t("changeHours")}
    </button>
  );
}

/** En el celu estos datos van junto al título, y en PC en su propia sección: cada uno se muestra en su ancho. */
export function GameHeaderFacts({ game, onEdit, onEditPlayed }: GameFactsProps) {
  const t = useTranslations("game.facts");
  const durationText = useDurationText();

  return (
    <div className={styles.headerFacts}>
      <p className={styles.played}>
        {t("playedHeader", { hours: playedHoursText(game) })} <PlayedButton game={game} onEditPlayed={onEditPlayed} />
      </p>
      <p className={styles.duration}>
        {/* En el celu no hay un rótulo «Duración»: la ayuda va junto al dato. */}
        <span className={styles.withHelp}>
          {durationText(game)}
          <HelpTip help={HELP.duration} />
        </span>
        <button type="button" className={styles.edit} onClick={onEdit}>
          {t("edit")}
        </button>
      </p>
    </div>
  );
}

export function GameFacts({ game, onEdit, onEditPlayed }: GameFactsProps) {
  const t = useTranslations("game.facts");
  const durationText = useDurationText();
  const { monthYear } = useDateFormat();

  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>{t("title")}</h2>
      <dl className={styles.list}>
        {game.developer ? (
          <>
            <dt className={styles.term}>{t("developer")}</dt>
            <dd className={styles.value}>{game.developer}</dd>
          </>
        ) : null}
        <dt className={`${styles.term} ${styles.withHelp}`}>
          {t("duration")}
          <HelpTip help={HELP.duration} />
        </dt>
        <dd className={styles.value}>
          {durationText(game)}{" "}
          <button type="button" className={styles.edit} onClick={onEdit}>
            {t("edit")}
          </button>
        </dd>
        <dt className={styles.term}>{t("played")}</dt>
        <dd className={styles.value}>
          {t("hours", { hours: playedHoursText(game) })} <PlayedButton game={game} onEditPlayed={onEditPlayed} />
        </dd>
        <dt className={styles.term}>{t("added")}</dt>
        <dd className={styles.value}>{monthYear(game.addedAt.slice(0, "AAAA-MM-DD".length))}</dd>
        {game.pageUrl ? (
          <>
            <dt className={styles.term}>{t("page")}</dt>
            <dd className={styles.value}>
              <a className={styles.link} href={game.pageUrl} target="_blank" rel="noreferrer">
                {game.source === "manual" ? t("open") : "IGDB"}
              </a>
            </dd>
          </>
        ) : null}
      </dl>
    </section>
  );
}
