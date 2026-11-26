import { useLocale, useTranslations } from "next-intl";

import { useCopyText } from "@/components/copy/copy-text";
import { statusName as nameOfStatus } from "@/components/status/status-text";
import { keptCopies, type SuggestedCopy } from "@/model/import/copies";
import type { ReviewChoice, ReviewGame, ReviewGroup, ReviewOrigin, StatusRef } from "@/model/import/review";
import { formatHours } from "@/model/game/library-game";
import {
  ABANDONED_KEY,
  BACKLOG_KEY,
  COMPLETED_KEY,
  DEFAULT_STATUSES,
  PAUSED_KEY,
  PLAYED_KEY,
  PLAYING_KEY,
  TRIED_KEY,
  WISHLIST_KEY,
} from "@/model/status/status";
import { EPIC_GAMES_SLUG, STEAM_SLUG } from "@/model/store/store";

const MINUTES_PER_HOUR = 60;
// Separa las partes de «Entra como Backlog · Epic Games · Gratis», como en los chips de origen.
const PART_SEPARATOR = " · ";

/** Los estados de IGN que «¿Cómo lo dejaste?» dice en palabras («Lo terminaste»). */
const HOW_LEFT_KEYS = [COMPLETED_KEY, ABANDONED_KEY, PLAYING_KEY, PAUSED_KEY, BACKLOG_KEY, WISHLIST_KEY] as const;

type HowLeftKey = (typeof HOW_LEFT_KEYS)[number];

function howLeftKeyOf(statusKey: string): HowLeftKey | undefined {
  return HOW_LEFT_KEYS.find((key) => key === statusKey);
}

/** El texto de cada respuesta de «Elegí un estado», según el juego tenga final o sea sin fin (design.md §9). */
const STATUS_ANSWERS = {
  [PLAYING_KEY]: "playing",
  [COMPLETED_KEY]: "completed",
  [ABANDONED_KEY]: "abandoned",
  [TRIED_KEY]: "tried",
} as const;

const ENDLESS_STATUS_ANSWERS = {
  [PLAYING_KEY]: "stillPlaying",
  [PLAYED_KEY]: "notAnymore",
  [TRIED_KEY]: "tried",
} as const;

type StatusAnswer = (typeof STATUS_ANSWERS)[keyof typeof STATUS_ANSWERS] | (typeof ENDLESS_STATUS_ANSWERS)[keyof typeof ENDLESS_STATUS_ANSWERS];

function statusAnswerOf(systemKey: string | null, endless: boolean): StatusAnswer | undefined {
  const answers: Readonly<Record<string, StatusAnswer>> = endless ? ENDLESS_STATUS_ANSWERS : STATUS_ANSWERS;
  return systemKey === null ? undefined : answers[systemKey];
}

const STEAM_NAME = "Steam";

export type OriginChip = Readonly<{ label: string; warning: boolean }>;

/** Pone en palabras las opciones y el origen de cada juego de la revisión. Los títulos van tal cual. */
export function useImportText() {
  const t = useTranslations("import");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const copyText = useCopyText();

  /** El nombre del estado del usuario: el renombrado tal cual, el de fábrica en el idioma elegido. */
  function statusName(status: StatusRef): string {
    return nameOfStatus(status, tStatus);
  }

  /** Un estado de fábrica por su `system_key`, cuando la revisión no tiene el del usuario a mano. */
  function defaultStatusName(systemKey: string): string {
    const status = DEFAULT_STATUSES.find((value) => value.systemKey === systemKey);
    return status ? nameOfStatus(status, tStatus) : systemKey;
  }

  /** «Lo terminaste»; un estado que IGN no da se nombra como lo tiene el usuario. */
  function howLeft(status: StatusRef): string {
    const key = status.systemKey === null ? undefined : howLeftKeyOf(status.systemKey);
    return key ? t(`choices.howLeft.${key}`) : statusName(status);
  }

  /** «Lo estoy jugando» o «Lo sigo jugando»; un estado de «Otro estado» se nombra como lo tiene el usuario. */
  function statusAnswer(status: StatusRef, game: ReviewGame): string {
    const key = statusAnswerOf(status.systemKey, game.endless);
    return key ? t(`choices.statusAnswer.${key}`) : statusName(status);
  }

  /** El texto de cada respuesta, dicho como respuesta a la pregunta del grupo (design.md §9). */
  function choice(value: ReviewChoice, game?: ReviewGame): string {
    switch (value.kind) {
      case "candidate":
        return value.candidate.year === null ? value.candidate.title : `${value.candidate.title} (${value.candidate.year})`;
      case "status":
        if (game?.group === "how_left") {
          return howLeft(value.status);
        }

        return game ? statusAnswer(value.status, game) : statusName(value.status);
      case "copy_kind":
        return value.copyKind === "family" ? t("choices.familyYes") : t("choices.familyNo");
      case "other_status":
        return t("choices.otherStatus");
      case "hidden":
        return t("choices.hidden");
      default:
        return t(`choices.${value.kind}`);
    }
  }

  /** Cómo va a entrar después de una respuesta, para el aviso (design.md §9). */
  function result(value: ReviewChoice, game: ReviewGame): string {
    switch (value.kind) {
      case "status":
        return statusName(value.status);
      case "copy_kind": {
        const steam = game.suggestion.copies.find((copy) => copy.store.slug === STEAM_SLUG)?.store.name ?? STEAM_NAME;
        return t("review.origin.store", { store: steam, kind: copyText.kind(value.copyKind) });
      }
      case "keep":
        return game.suggestion.status ? statusName(game.suggestion.status) : defaultStatusName(BACKLOG_KEY);
      case "hidden":
      case "hide":
        return t("review.entersHidden");
      case "endless":
        return [defaultStatusName(PLAYED_KEY), t("review.entersEndless")].join(PART_SEPARATOR);
      case "completed":
        return defaultStatusName(COMPLETED_KEY);
      default:
        return choice(value);
    }
  }

  function ignOrigin(origin: ReviewOrigin): OriginChip {
    const statuses = origin.ignStatuses.map((status) => t(`review.ignStatus.${status}`)).join(", ");
    const label =
      origin.ignScore === null
        ? t("review.origin.ign", { statuses })
        : t("review.origin.ignScored", { statuses, score: String(origin.ignScore) });
    return { label, warning: false };
  }

  function copyChip(copy: SuggestedCopy): OriginChip {
    if (copy.awaitingSteam || (copy.familySuggested && !copy.chosen)) {
      return { label: t("review.origin.steamPc"), warning: true };
    }

    const kind = copyText.kind(copy.kind);
    const label =
      copy.playtimeMinutes === null
        ? t("review.origin.store", { store: copy.store.name, kind })
        : t("review.origin.storeHours", { store: copy.store.name, kind, hours: formatHours(copy.playtimeMinutes / MINUTES_PER_HOUR) });
    return { label, warning: false };
  }

  /** «Epic Games · Gratis», sin horas: dice cómo entra, no de dónde vino. */
  function copyEntry(copy: SuggestedCopy): string {
    return t("review.origin.store", { store: copy.store.name, kind: copyText.kind(copy.kind) });
  }

  /** «En IGN:», «En Epic:»: de dónde llegó, antes del nombre con que llegó. */
  function arrival(origin: ReviewOrigin): string {
    if (origin.source !== "playnite") {
      return t(`review.arrival.${origin.source}`);
    }

    return origin.storeSlug === EPIC_GAMES_SLUG ? t("review.arrival.epic") : t("review.arrival.store", { store: origin.storeName ?? "" });
  }

  /** «Entra como Backlog · Epic Games · Gratis» (design.md §9). */
  function entersAs(game: ReviewGame): string {
    const copies = keptCopies(game.suggestion.copies).map(copyEntry);

    if (game.libraryGameId) {
      return t("review.inLibraryAdds", { copies: copies.join(PART_SEPARATOR) });
    }

    const status = game.suggestion.status ? statusName(game.suggestion.status) : "";
    const parts = [
      game.manual ? t("review.entersManual", { status }) : t("review.enters", { status }),
      game.suggestion.endless ? t("review.entersEndless") : "",
      game.suggestion.hidden ? t("review.entersHidden") : "",
      ...copies,
    ];
    return parts.filter(Boolean).join(PART_SEPARATOR);
  }

  /** «IGN lo tiene como terminado y como abandonado.» */
  function ignHas(statusKeys: readonly string[]): string {
    const parts = statusKeys.flatMap((statusKey) => {
      const key = howLeftKeyOf(statusKey);
      return key ? [t(`review.ignAs.${key}`)] : [];
    });
    return t("review.ignHas", { list: new Intl.ListFormat(locale, { type: "conjunction" }).format(parts) });
  }

  /** «2 a «¿Lo vas a jugar alguna vez?» y 1 a «Listos para importar»», con la conjunción del idioma. */
  function list(parts: readonly string[]): string {
    return new Intl.ListFormat(locale, { type: "conjunction" }).format(parts);
  }

  return {
    choice,
    result,
    list,
    statusName,
    howLeft,
    arrival,
    entersAs,
    ignHas,
    groupName: (group: ReviewGroup) => t(`groups.${group}.name`),
    /** «IGN · Beat · 9» y una por copia: «Steam · Comprado · 48 h», «Epic Games · Gratis». */
    origins(game: ReviewGame): readonly OriginChip[] {
      const ign = game.origins.filter((origin) => origin.source === "ign").map(ignOrigin);
      const copies = game.suggestion.copies.filter((copy) => !copy.excluded).map(copyChip);
      return [...ign, ...copies];
    },
  };
}
