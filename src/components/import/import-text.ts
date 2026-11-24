import { useTranslations } from "next-intl";

import { useCopyText } from "@/components/copy/copy-text";
import { statusName as nameOfStatus } from "@/components/status/status-text";
import type { SuggestedCopy } from "@/model/import/copies";
import type { ReviewChoice, ReviewGame, ReviewGroup, ReviewOrigin } from "@/model/import/review";
import { formatHours } from "@/model/game/library-game";
import { DEFAULT_STATUSES } from "@/model/status/status";

const MINUTES_PER_HOUR = 60;

export type OriginChip = Readonly<{ label: string; warning: boolean }>;

/** Pone en palabras las opciones y el origen de cada juego de la revisión. Los títulos van tal cual. */
export function useImportText() {
  const t = useTranslations("import");
  const tStatus = useTranslations("status");
  const copyText = useCopyText();

  /** La revisión habla de los estados de fábrica por su `system_key`. */
  function statusName(statusKey: string): string {
    const status = DEFAULT_STATUSES.find((value) => value.systemKey === statusKey);
    return status ? nameOfStatus(status, tStatus) : statusKey;
  }

  function choice(value: ReviewChoice): string {
    switch (value.kind) {
      case "candidate":
        return value.candidate.year === null ? value.candidate.title : `${value.candidate.title} (${value.candidate.year})`;
      case "status":
        return statusName(value.statusKey);
      case "copy_kind":
        return copyText.kind(value.copyKind);
      case "other_status":
        return t("choices.otherStatus");
      case "other_kind":
        return t("choices.otherKind");
      case "not_interested":
        return t("choices.notInterested");
      case "exclude_copy":
        return t("choices.exclude");
      default:
        return t(`choices.${value.kind}`);
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

  return {
    choice,
    statusName,
    groupName: (group: ReviewGroup) => t(`groups.${group}.name`),
    /** «IGN · Beat · 9» y una por copia: «Steam · Comprado · 48 h», «Epic Games · Gratis». */
    origins(game: ReviewGame): readonly OriginChip[] {
      const ign = game.origins.filter((origin) => origin.source === "ign").map(ignOrigin);
      const copies = game.suggestion.copies.filter((copy) => !copy.excluded).map(copyChip);
      return [...ign, ...copies];
    },
  };
}
