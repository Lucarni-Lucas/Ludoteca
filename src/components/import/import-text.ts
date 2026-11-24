import { useLocale, useTranslations } from "next-intl";

import { useCopyText } from "@/components/copy/copy-text";
import { statusName as nameOfStatus } from "@/components/status/status-text";
import { keptCopies, type SuggestedCopy } from "@/model/import/copies";
import { PLAYED_KEY, type ReviewChoice, type ReviewGame, type ReviewGroup, type ReviewOrigin, STATUS_ANSWER_KEYS } from "@/model/import/review";
import { formatHours } from "@/model/game/library-game";
import { BACKLOG_KEY, DEFAULT_STATUSES } from "@/model/status/status";
import { EPIC_GAMES_SLUG, STEAM_SLUG } from "@/model/store/store";

const MINUTES_PER_HOUR = 60;
// Separa las partes de «Entra como Pendiente · Epic Games · Gratis», como en los chips de origen.
const PART_SEPARATOR = " · ";

/** Los estados de IGN que «¿Cómo lo dejaste?» dice en palabras («Lo terminaste»). */
const HOW_LEFT_KEYS = ["completed", "abandoned", "playing", "paused", "backlog", "wishlist"] as const;

type HowLeftKey = (typeof HOW_LEFT_KEYS)[number];

function howLeftKeyOf(statusKey: string): HowLeftKey | undefined {
  return HOW_LEFT_KEYS.find((key) => key === statusKey);
}

type StatusAnswerKey = (typeof STATUS_ANSWER_KEYS)[number];

function statusAnswerKeyOf(statusKey: string): StatusAnswerKey | undefined {
  return STATUS_ANSWER_KEYS.find((key) => key === statusKey);
}

const COMPLETED_KEY = "completed";
const STEAM_NAME = "Steam";

export type OriginChip = Readonly<{ label: string; warning: boolean }>;

/** Pone en palabras las opciones y el origen de cada juego de la revisión. Los títulos van tal cual. */
export function useImportText() {
  const t = useTranslations("import");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const copyText = useCopyText();

  /** La revisión habla de los estados de fábrica por su `system_key`. */
  function statusName(statusKey: string): string {
    const status = DEFAULT_STATUSES.find((value) => value.systemKey === statusKey);
    return status ? nameOfStatus(status, tStatus) : statusKey;
  }

  /** «Lo terminaste»; un estado que IGN no da se nombra tal cual. */
  function howLeft(statusKey: string): string {
    const key = howLeftKeyOf(statusKey);
    return key ? t(`choices.howLeft.${key}`) : statusName(statusKey);
  }

  /** «Lo estoy jugando»: las respuestas de «Elegí un estado»; otro estado se nombra tal cual. */
  function statusAnswer(statusKey: string): string {
    const key = statusAnswerKeyOf(statusKey);
    return key ? t(`choices.statusAnswer.${key}`) : statusName(statusKey);
  }

  /** El texto de cada respuesta, dicho como respuesta a la pregunta del grupo (design.md §9). */
  function choice(value: ReviewChoice): string {
    switch (value.kind) {
      case "candidate":
        return value.candidate.year === null ? value.candidate.title : `${value.candidate.title} (${value.candidate.year})`;
      case "status":
        return statusAnswer(value.statusKey);
      case "copy_kind":
        return value.copyKind === "family" ? t("choices.familyYes") : t("choices.familyNo");
      case "other_status":
        return t("choices.otherStatus");
      case "not_interested":
        return t("choices.notInterested");
      default:
        return t(`choices.${value.kind}`);
    }
  }

  /** Cómo va a entrar después de una respuesta, para el aviso: «No» es «Sin interés» (design.md §9). */
  function result(value: ReviewChoice, game: ReviewGame): string {
    switch (value.kind) {
      case "status":
        return statusName(value.statusKey);
      case "copy_kind": {
        const steam = game.suggestion.copies.find((copy) => copy.store.slug === STEAM_SLUG)?.store.name ?? STEAM_NAME;
        return t("review.origin.store", { store: steam, kind: copyText.kind(value.copyKind) });
      }
      case "keep":
        return statusName(BACKLOG_KEY);
      case "not_interested":
        return t("review.entersNotInterested");
      case "endless":
        return [statusName(PLAYED_KEY), t("review.entersEndless")].join(PART_SEPARATOR);
      case "completed":
        return statusName(COMPLETED_KEY);
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

  /** «Entra como Pendiente · Epic Games · Gratis» (design.md §9). */
  function entersAs(game: ReviewGame): string {
    const copies = keptCopies(game.suggestion.copies).map(copyEntry);

    if (game.libraryGameId) {
      return t("review.inLibraryAdds", { copies: copies.join(PART_SEPARATOR) });
    }

    const status = statusName(game.suggestion.statusKey);
    const parts = [
      game.manual ? t("review.entersManual", { status }) : t("review.enters", { status }),
      game.suggestion.endless ? t("review.entersEndless") : "",
      game.suggestion.notInterested ? t("review.entersNotInterested") : "",
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

  return {
    choice,
    result,
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
