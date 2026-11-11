import { isManual, type LibraryGame } from "@/model/game/library-game";

export type GameRemovalPlan = Readonly<{
  libraryGameId: string;
  catalogGameIdToDelete: string | null;
}>;

/** La fila de un juego a mano solo la puede tener su dueño; la de IGDB es catálogo compartido y siempre queda. */
export function planGameRemoval(game: Pick<LibraryGame, "id" | "catalogGameId" | "source">): GameRemovalPlan {
  return {
    libraryGameId: game.id,
    catalogGameIdToDelete: isManual(game) ? game.catalogGameId : null,
  };
}
