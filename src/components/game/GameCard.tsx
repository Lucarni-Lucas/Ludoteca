import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { CopyChips } from "@/components/copy/CopyChips";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useStatusText } from "@/components/status/status-text";
import { ClockIcon } from "@/components/ui/icons";
import { effectiveCover, formatHours, hasPlayedHours, type LibraryGame, playedHours } from "@/model/game/library-game";
import { formatScore } from "@/model/game/score";
import { isWishlist } from "@/model/status/status";

import { GameCover } from "./GameCover";
import styles from "./GameCard.module.css";

const CLOCK_ICON_SIZE = 13;

type GameCardProps = Readonly<{
  game: LibraryGame;
  /** En el modo de selección la tarjeta es un botón; `selected` indica si está elegida. */
  selection?: Readonly<{ selected: boolean; onToggle: () => void }>;
}>;

type CardTranslator = ReturnType<typeof useTranslations<"library.card">>;

function playedText(game: LibraryGame, t: CardTranslator): string | null {
  if (!hasPlayedHours(game)) {
    return null;
  }

  const hours = playedHours(game);
  return hours > 0 ? t("hours", { hours: formatHours(hours) }) : t("notStarted");
}

function CardContents({ game }: Readonly<{ game: LibraryGame }>) {
  const t = useTranslations("library.card");
  const statusText = useStatusText();
  const notBought = isWishlist(game.status) && game.copies.length === 0;
  const played = playedText(game, t);

  return (
    <>
      <GameCover
        title={game.title}
        coverUrl={effectiveCover(game)}
        year={game.year}
        variant="card"
        dashed={notBought}
      />
      <span className={styles.details}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{game.title}</span>
          {game.score === null ? null : (
            <span className={styles.score}>
              {formatScore(game.score)}
              <span className={styles.scoreOutOf}>/10</span>
            </span>
          )}
        </span>
        <span className={styles.statusRow}>
          <StatusBadge group={game.status.group} color={game.status.color}>
            {statusText.name(game.status)}
          </StatusBadge>
          {played ? (
            <span className={styles.played}>
              <ClockIcon size={CLOCK_ICON_SIZE} />
              {played}
            </span>
          ) : null}
        </span>
        <span className={styles.chips}>
          {game.source === "manual" ? <span className={styles.badge}>{t("manual")}</span> : null}
          {game.notInterested ? <span className={styles.badge}>{t("notInterested")}</span> : null}
          <CopyChips copies={game.copies} notBought={notBought} />
        </span>
      </span>
    </>
  );
}

function Wrapper({ game, selection, children }: GameCardProps & Readonly<{ children: ReactNode }>) {
  const t = useTranslations("library.card");

  if (selection) {
    return (
      <button
        type="button"
        className={styles.card}
        aria-pressed={selection.selected}
        aria-label={t("select", { title: game.title })}
        onClick={selection.onToggle}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={`/games/${game.id}`} className={styles.card} aria-label={t("open", { title: game.title })}>
      {children}
    </Link>
  );
}

/** Un solo DOM para los dos anchos: el CSS la pasa de fila de lista a tarjeta de grilla. */
export function GameCard({ game, selection }: GameCardProps) {
  return (
    <article className={styles.item}>
      <Wrapper game={game} selection={selection}>
        <CardContents game={game} />
      </Wrapper>
    </article>
  );
}
