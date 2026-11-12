import type { NewCopy } from "@/model/copy/new-copy";
import type { IgdbSearchResult } from "@/model/game/catalog";
import { isManual, type LibraryGame } from "@/model/game/library-game";
import { GameNotFromIgdbError, GameNotManualError } from "@/model/game/errors";
import { WISHLIST_KEY } from "@/model/status/status";

/** Un juego se agrega entero, con sus copias y su puntaje, en una sola transacción. */
export type NewLibraryEntry = Readonly<{
  statusId: string;
  statusSince: string;
  copies: readonly NewCopy[];
  score: number | null;
}>;

/** «Ya lo tenés» no es un fallo: la pantalla ofrece agregar una copia al juego existente. */
export type AddGameResult = Readonly<{
  kind: "added" | "already_in_library";
  gameId: string;
}>;

export type OwnedGameMark = Readonly<{
  igdbId: number;
  gameId: string;
  statusSystemKey: string | null;
}>;

export type SearchResultMark =
  | Readonly<{ kind: "new" }>
  | Readonly<{ kind: "in_library" | "wishlist"; gameId: string }>;

export type MarkedSearchResult = IgdbSearchResult & Readonly<{ mark: SearchResultMark }>;

function toMark(owned: OwnedGameMark | undefined): SearchResultMark {
  if (!owned) {
    return { kind: "new" };
  }

  return { kind: owned.statusSystemKey === WISHLIST_KEY ? "wishlist" : "in_library", gameId: owned.gameId };
}

/** Se compara por id base: una edición de un juego que ya tenés también cuenta como ese juego. */
export function markSearchResults(
  results: readonly IgdbSearchResult[],
  owned: readonly OwnedGameMark[],
): readonly MarkedSearchResult[] {
  const byIgdbId = new Map(owned.map((mark) => [mark.igdbId, mark]));

  return results.map((result) => ({ ...result, mark: toMark(byIgdbId.get(result.baseIgdbId)) }));
}

export function assertManualGame(game: Pick<LibraryGame, "source">): void {
  if (!isManual(game)) {
    throw new GameNotManualError();
  }
}

export function assertIgdbGame(game: Pick<LibraryGame, "igdbId">): number {
  if (game.igdbId === null) {
    throw new GameNotFromIgdbError();
  }

  return game.igdbId;
}
