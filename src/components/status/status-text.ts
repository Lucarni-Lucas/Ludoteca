import { useTranslations } from "next-intl";

import { useDateFormat } from "@/i18n/dates";
import { hasDefaultName, type Status, statusMeaningKey, statusSince } from "@/model/status/status";
import type { StatusGroup } from "@/model/status/status-group";

const SEPARATOR = " · ";

type DefaultKey = Parameters<ReturnType<typeof useTranslations<"status.defaults">>>[0];
type MeaningKey = Parameters<ReturnType<typeof useTranslations<"status.meanings">>>[0];

/** El nombre que ve el usuario: el por defecto de su idioma si no lo renombró, o el suyo tal cual (design.md §8). */
export function statusName(status: Pick<Status, "name" | "systemKey">, t: ReturnType<typeof useTranslations<"status">>): string {
  return hasDefaultName(status) ? t(`defaults.${status.systemKey as DefaultKey}`) : status.name;
}

export function useStatusText() {
  const t = useTranslations("status");
  const { dayMonth } = useDateFormat();

  return {
    name: (status: Pick<Status, "name" | "systemKey">): string => statusName(status, t),
    /** «Completado · 100%»: el nombre con la marca, en la tarjeta y en la ficha (`04` design.md §22). */
    label(status: Pick<Status, "name" | "systemKey">, hundredPercent: boolean): string {
      const name = statusName(status, t);
      return hundredPercent ? t("withHundredPercent", { status: name }) : name;
    },
    group: (group: StatusGroup): string => t(`groups.${group}`),
    /** «Lo estás jugando ahora»: solo los estados de fábrica, también renombrados (`04` design.md §19). */
    meaning(status: Pick<Status, "systemKey">): string | null {
      const key = statusMeaningKey(status);
      return key ? t(`meanings.${key as MeaningKey}`) : null;
    },
    since(status: Pick<Status, "group">, since: string): string {
      const parts = statusSince(status, since);
      const date = dayMonth(parts.date);
      const detail = parts.finished ? t("finishedOn", { date }) : t("since", { date });
      const group = t(`groups.${parts.group}`);
      return `${group}${SEPARATOR}${detail}`;
    },
  };
}
