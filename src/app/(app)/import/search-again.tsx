"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";

import { IgdbResults } from "@/components/game/IgdbResults";
import controls from "@/components/ui/controls.module.css";
import { useIgdbSearch } from "@/hooks/use-igdb-search";
import type { IgdbSearchResult } from "@/model/game/catalog";
import type { ReviewGame } from "@/model/import/review";

import styles from "./page.module.css";

type SearchAgainProps = Readonly<{
  game: ReviewGame;
  busy: boolean;
  onPick: (result: IgdbSearchResult) => void;
  onClose: () => void;
}>;

/** «Buscar con otro nombre»: la misma búsqueda de IGDB de «Agregar juego» (`02` §6). */
export function SearchAgain({ game, busy, onPick, onClose }: SearchAgainProps) {
  const t = useTranslations();
  const fieldId = useId();
  const search = useIgdbSearch();

  return (
    <div className={styles.searchAgain}>
      <label htmlFor={fieldId} className={controls.field}>
        {t("import.review.searchLabel")}
      </label>
      <input
        id={fieldId}
        className={controls.input}
        type="search"
        value={search.query}
        placeholder={game.title}
        onChange={(event) => search.setQuery(event.target.value)}
      />
      {search.errorMessage ? <p className={controls.error}>{search.errorMessage}</p> : null}
      {search.noResults ? <p className={controls.hint}>{t("add.noResults", { query: search.trimmedQuery })}</p> : null}
      <IgdbResults
        results={search.results}
        renderAction={(result) => (
          <button type="button" className={controls.primary} disabled={busy} onClick={() => onPick(result)}>
            {t("import.review.pick")}
          </button>
        )}
      />
      <button type="button" className={controls.ghost} onClick={onClose}>
        {t("import.review.cancel")}
      </button>
    </div>
  );
}
