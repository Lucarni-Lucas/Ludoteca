import type { ImportEntry, ImportItem, ItemMatch } from "@/model/import/import-entry";
import { NO_ANSWERS } from "@/model/import/import-entry";
import { isNonGame } from "@/model/import/non-game";
import { titleKey } from "@/model/import/title-match";

/** Lo que no cruzó solo y espera que el usuario diga qué juego es. */
const UNMATCHED_STATES: ReadonlySet<ImportItem["matchState"]> = new Set(["candidates", "not_found"]);

function hasNoAnswers(entry: ImportEntry): boolean {
  return Object.entries(NO_ANSWERS).every(([key, value]) => entry.answers[key as keyof typeof NO_ANSWERS] === value);
}

function untouched(item: ImportItem): boolean {
  return item.chosenIgdbId === null && item.copyKind === null && !item.excluded && !isNonGame(item.title);
}

/**
 * Un juego a revisar que todavía espera respuesta: sin juego de IGDB, sin nada decidido y con alguna fila sin
 * cruzar. Solo a uno así se suma una fila con el mismo nombre: sumarla a una respuesta que el usuario dio sin
 * verla podría dejarla afuera con «No importar» (design.md §10).
 */
export function awaitsIdentity(entry: ImportEntry): boolean {
  return (
    entry.igdbId === null &&
    hasNoAnswers(entry) &&
    entry.items.every(untouched) &&
    entry.items.some((item) => UNMATCHED_STATES.has(item.matchState))
  );
}

/** El mismo nombre es la misma clave del título con que llegó; los alternativos de IGN no cuentan. */
function sameNameKey(item: ImportItem): string {
  return titleKey(item.title);
}

type Destination = Readonly<{ joinEntryId: string }> | Readonly<{ joinItemId: string }>;

function waitingByName(open: readonly ImportEntry[]): Map<string, Destination> {
  const byName = new Map<string, Destination>();

  for (const entry of open.filter(awaitsIdentity)) {
    for (const item of entry.items) {
      if (!byName.has(sameNameKey(item))) {
        byName.set(sameNameKey(item), { joinEntryId: entry.id });
      }
    }
  }

  return byName;
}

function joinable(match: ItemMatch): boolean {
  return match.kind === "candidates" || (match.kind === "not_found" && match.notAGame !== true);
}

/**
 * A qué juego a revisar va cada fila que no cruzó: uno abierto que espera respuesta con el mismo nombre, o el
 * de la primera fila de la tanda con ese nombre. Las demás crean el suyo, como siempre.
 */
export function joinSameName(
  matches: readonly ItemMatch[],
  items: readonly ImportItem[],
  open: readonly ImportEntry[],
): readonly ItemMatch[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const destinations = waitingByName(open);

  return matches.map((match) => {
    const item = byId.get(match.itemId);

    if (!joinable(match) || item === undefined) {
      return match;
    }

    const key = sameNameKey(item);
    const destination = destinations.get(key);

    if (destination === undefined) {
      destinations.set(key, { joinItemId: match.itemId });
      return match;
    }

    return { ...match, ...destination };
  });
}
