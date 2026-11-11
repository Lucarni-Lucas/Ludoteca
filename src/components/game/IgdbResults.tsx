import type { ReactNode } from "react";

import type { MarkedSearchResult } from "@/model/game/add-game";

import { GameCover } from "./GameCover";
import styles from "./IgdbResults.module.css";

type IgdbResultsProps = Readonly<{
  results: readonly MarkedSearchResult[];
  renderAction: (result: MarkedSearchResult) => ReactNode;
}>;

function metaText({ year }: MarkedSearchResult): string {
  return year === null ? "IGDB" : `${year} · IGDB`;
}

export function IgdbResults({ results, renderAction }: IgdbResultsProps) {
  return (
    <ul className={styles.list}>
      {results.map((result) => (
        <li key={result.igdbId} className={styles.row}>
          <GameCover title={result.title} coverUrl={result.coverUrl} variant="small" />
          <div className={styles.text}>
            <span className={styles.title}>{result.title}</span>
            <span className={styles.meta}>{metaText(result)}</span>
          </div>
          {renderAction(result)}
        </li>
      ))}
    </ul>
  );
}
