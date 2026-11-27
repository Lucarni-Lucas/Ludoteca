import type { StatusChangeEntry } from "@/model/journal/journal-entry";
import { EndlessChangeNotAcceptedError } from "@/model/status/errors";
import { STATUS_GROUPS, type StatusGroup } from "@/model/status/status-group";

export const STATUS_COLORS = ["lime", "amber", "gray", "blue", "coral", "violet", "green"] as const;

export type StatusColor = (typeof STATUS_COLORS)[number];

/**
 * «Quiero jugarlo» ya no es la wishlist: es «lo querés jugar pronto, lo tengas o no». La clave interna no cambió
 * porque no se ve y cambiarla pedía otro paso en la migración (`04` design.md §19).
 */
export const WISHLIST_KEY = "wishlist";
export const BACKLOG_KEY = "backlog";
export const PLAYING_KEY = "playing";
export const PAUSED_KEY = "paused";
export const COMPLETED_KEY = "completed";
export const PLAYED_KEY = "played";
export const ABANDONED_KEY = "abandoned";
export const TRIED_KEY = "tried";

export type Status = Readonly<{
  id: string;
  group: StatusGroup;
  name: string;
  color: StatusColor;
  position: number;
  systemKey: string | null;
}>;

export type DefaultStatus = Omit<Status, "id">;

/**
 * Los nombres en español son la marca de «no lo renombró», no texto para mostrar: lo que se ve sale del
 * catálogo, en `status.defaults.<system_key>` (design.md §8).
 */
export const DEFAULT_STATUSES: readonly DefaultStatus[] = [
  { group: "in_progress", name: "Jugando", color: "lime", position: 1, systemKey: PLAYING_KEY },
  { group: "in_progress", name: "En pausa", color: "green", position: 2, systemKey: PAUSED_KEY },
  { group: "not_started", name: "Quiero jugarlo", color: "amber", position: 1, systemKey: WISHLIST_KEY },
  { group: "not_started", name: "Backlog", color: "gray", position: 2, systemKey: BACKLOG_KEY },
  { group: "finished", name: "Completado", color: "blue", position: 1, systemKey: COMPLETED_KEY },
  { group: "finished", name: "Jugado", color: "blue", position: 2, systemKey: PLAYED_KEY },
  { group: "dropped", name: "Abandonado", color: "coral", position: 1, systemKey: ABANDONED_KEY },
  // Probar un juego y que no enganche no es algo negativo: no lleva el coral de Dejado (`04` design.md §22).
  { group: "dropped", name: "Lo probé", color: "violet", position: 2, systemKey: TRIED_KEY },
];

/** Las marcas de un juego que dependen de su estado: «Sin fin» y «100%» (`04` design.md §22). */
export type StatusMarks = Readonly<{ endless: boolean; hundredPercent: boolean }>;

/** Lo que eligió el usuario: el aviso de «Sin fin» aceptado y la casilla «Lo completé al 100%». */
export type MarkChoice = Readonly<{ acceptEndless?: boolean; hundredPercent?: boolean }>;

/**
 * Cómo cambia la marca «Sin fin» al pasar a `target`: «Jugado» la pone y «Completado» la saca. `null` si no
 * cambia.
 */
export function endlessChangeOf(endless: boolean, target: Pick<Status, "systemKey">): boolean | null {
  if (target.systemKey === PLAYED_KEY && !endless) {
    return true;
  }

  return target.systemKey === COMPLETED_KEY && endless ? false : null;
}

/**
 * Las marcas que quedan al pasar a `target`. Cambiar «Sin fin» pide el aviso aceptado; «100%» solo vale en
 * «Completado», y fuera de ese estado se borra.
 */
export function statusMarks(current: StatusMarks, target: Pick<Status, "systemKey">, choice: MarkChoice = {}): StatusMarks {
  const endlessChange = endlessChangeOf(current.endless, target);

  if (endlessChange !== null && choice.acceptEndless !== true) {
    throw new EndlessChangeNotAcceptedError();
  }

  const completed = target.systemKey === COMPLETED_KEY;
  return {
    endless: endlessChange ?? current.endless,
    hundredPercent: completed && (choice.hundredPercent ?? current.hundredPercent),
  };
}

/** La clave de «qué significa» del catálogo: la tiene todo estado de fábrica, también renombrado. */
export function statusMeaningKey(status: Pick<Status, "systemKey">): string | null {
  return DEFAULT_STATUSES.some((value) => value.systemKey === status.systemKey) ? status.systemKey : null;
}

export type StatusGroupView = Readonly<{
  group: StatusGroup;
  statuses: readonly Status[];
}>;

/** Los grupos salen del código y no de los datos: un grupo vacío se sigue mostrando, y siempre en este orden. */
export function groupStatuses(statuses: readonly Status[]): readonly StatusGroupView[] {
  return STATUS_GROUPS.map((group) => ({
    group,
    statuses: statuses.filter((status) => status.group === group).toSorted((a, b) => a.position - b.position),
  }));
}

export function needsDefaultStatuses(statuses: readonly Status[]): boolean {
  return statuses.length === 0;
}

/** El estado elegido en un formulario; vacío es «el de entrada», el Backlog del usuario. */
export function chosenOrBacklog(statuses: readonly Status[], statusId: string): Status | undefined {
  return statusId === "" ? findStatusByKey(statuses, BACKLOG_KEY) : statuses.find((status) => status.id === statusId);
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

export type StatusSince = Readonly<{
  group: StatusGroup;
  date: string;
  /** En Terminado, la fecha es la del fin: «lo terminaste el…» en lugar de «desde el…». */
  finished: boolean;
}>;

export function statusSince(status: Pick<Status, "group">, since: string): StatusSince {
  return { group: status.group, date: since, finished: finishedOn(status, since) !== null };
}

/**
 * Un estado de fábrica que conserva su nombre de fábrica se muestra con el nombre por defecto del idioma
 * elegido; cualquier otro nombre, tal cual. Compara con el de su propio `system_key`.
 */
export function hasDefaultName(status: Pick<Status, "name" | "systemKey">): boolean {
  const original = DEFAULT_STATUSES.find((value) => value.systemKey === status.systemKey);
  return status.systemKey !== null && original?.name === status.name;
}
