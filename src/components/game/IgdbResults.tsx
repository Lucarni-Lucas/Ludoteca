import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { MarkedSearchResult } from "@/model/game/add-game";

import { GameCover } from "./GameCover";
import styles from "./IgdbResults.module.css";

type IgdbResultsProps = Readonly<{
  results: readonly MarkedSearchResult[];
  renderAction: (result: MarkedSearchResult) => ReactNode;
}>;

export function IgdbResults({ results, renderAction }: IgdbResultsProps) {
  const t = useTranslations("add.result");
  const metaText = ({ year }: MarkedSearchResult) => (year === null ? "IGDB" : t("meta", { year: String(year) }));

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
