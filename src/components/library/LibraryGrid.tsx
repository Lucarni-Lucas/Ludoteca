import { GameCard } from "@/components/game/GameCard";
import type { LibraryGame } from "@/model/game/library-game";

import styles from "./LibraryGrid.module.css";

type LibraryGridProps = Readonly<{
  games: readonly LibraryGame[];
  /** Con estos dos, las tarjetas pasan a ser botones que se eligen. */
  selectedIds?: ReadonlySet<string>;
  onToggleSelected?: (gameId: string) => void;
}>;

export function LibraryGrid({ games, selectedIds, onToggleSelected }: LibraryGridProps) {
  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard
          key={game.id}
          game={game}
          selection={
            selectedIds && onToggleSelected
              ? { selected: selectedIds.has(game.id), onToggle: () => onToggleSelected(game.id) }
              : undefined
          }
        />
      ))}
    </div>
  );
}
