import { formatDayMonth } from "@/model/game/date-format";
import type { StatusChangeEntry } from "@/model/journal/journal-entry";
import { STATUS_GROUPS, type StatusGroup } from "@/model/status/status-group";

export const STATUS_COLORS = ["lime", "amber", "gray", "blue", "coral"] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

export const STATUS_GROUP_LABELS: Readonly<Record<StatusGroup, string>> = {
  in_progress: "En curso",
  not_started: "Sin empezar",
  finished: "Terminado",
  dropped: "Dejado",
};

export const WISHLIST_KEY = "wishlist";
export const BACKLOG_KEY = "backlog";

export type Status = Readonly<{
  id: string;
  group: StatusGroup;
  name: string;
  color: StatusColor;
  position: number;
  systemKey: string | null;
}>;

export type DefaultStatus = Omit<Status, "id">;

export const DEFAULT_STATUSES: readonly DefaultStatus[] = [
  { group: "in_progress", name: "Jugando", color: "lime", position: 1, systemKey: "playing" },
  { group: "in_progress", name: "En pausa", color: "lime", position: 2, systemKey: "paused" },
  { group: "in_progress", name: "Sin fin", color: "lime", position: 3, systemKey: "endless" },
  { group: "not_started", name: "Quiero jugarlo", color: "amber", position: 1, systemKey: WISHLIST_KEY },
  { group: "not_started", name: "Pendiente", color: "gray", position: 2, systemKey: BACKLOG_KEY },
  { group: "finished", name: "Completado", color: "blue", position: 1, systemKey: "completed" },
  { group: "finished", name: "100%", color: "blue", position: 2, systemKey: "hundred_percent" },
  { group: "finished", name: "Jugado", color: "blue", position: 3, systemKey: "played" },
  { group: "dropped", name: "Abandonado", color: "coral", position: 1, systemKey: "abandoned" },
  { group: "dropped", name: "Lo probé", color: "coral", position: 2, systemKey: "tried" },
];

export type StatusGroupView = Readonly<{
  group: StatusGroup;
  label: string;
  statuses: readonly Status[];
}>;

/** Los grupos salen del código y no de los datos: un grupo vacío se sigue mostrando, y siempre en este orden. */
export function groupStatuses(statuses: readonly Status[]): readonly StatusGroupView[] {
  return STATUS_GROUPS.map((group) => ({
    group,
    label: STATUS_GROUP_LABELS[group],
    statuses: statuses.filter((status) => status.group === group).toSorted((a, b) => a.position - b.position),
  }));
}

export function needsDefaultStatuses(statuses: readonly Status[]): boolean {
  return statuses.length === 0;
}

export function findStatusByKey(statuses: readonly Status[], systemKey: string): Status | undefined {
  return statuses.find((status) => status.systemKey === systemKey);
}

export function isWishlist(status: Pick<Status, "systemKey">): boolean {
  return status.systemKey === WISHLIST_KEY;
}

export type StatusChangePlan = Readonly<{
  statusId: string;
  statusSince: string;
  entry: StatusChangeEntry;
}>;

/** Devuelve `null` si no cambia nada: elegir el estado actual no es un cambio y no va al diario. */
export function planStatusChange(
  game: Readonly<{ status: Pick<Status, "id"> }>,
  target: Pick<Status, "id">,
  today: string,
): StatusChangePlan | null {
  if (game.status.id === target.id) {
    return null;
  }

  return {
    statusId: target.id,
    statusSince: today,
    entry: { occurredOn: today, fromStatusId: game.status.id, toStatusId: target.id },
  };
}

/** La fecha de fin no se guarda: entrar a Terminado siempre fija «desde» en ese día. */
export function finishedOn(status: Pick<Status, "group">, statusSince: string): string | null {
  return status.group === "finished" ? statusSince : null;
}

export function statusSinceLabel(status: Pick<Status, "group">, statusSince: string): string {
  const date = formatDayMonth(statusSince);
  const detail = finishedOn(status, statusSince) ? `lo terminaste el ${date}` : `desde el ${date}`;

  return `${STATUS_GROUP_LABELS[status.group]} · ${detail}`;
}
