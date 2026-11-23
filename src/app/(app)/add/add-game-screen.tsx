"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AddResultAction } from "@/components/game/AddResultAction";
import { IgdbAddDialog } from "@/components/game/IgdbAddDialog";
import { IgdbResults } from "@/components/game/IgdbResults";
import { BackLink } from "@/components/layout/BackLink";
import controls from "@/components/ui/controls.module.css";
import { SearchIcon } from "@/components/ui/icons";
import type { EntryValues } from "@/hooks/use-entry-form";
import { useIgdbSearch } from "@/hooks/use-igdb-search";
import { useServerAction } from "@/hooks/use-server-action";
import type { MarkedSearchResult } from "@/model/game/add-game";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

import { addFromIgdbAction } from "./actions";
import { ManualGameSection } from "./manual-game-section";
import styles from "./page.module.css";

const SEARCH_ICON_SIZE = 20;

type AddGameScreenProps = Readonly<{
  stores: readonly Store[];
  statusGroups: readonly StatusGroupView[];
}>;

export function AddGameScreen({ stores, statusGroups }: AddGameScreenProps) {
  const t = useTranslations();
  const search = useIgdbSearch();
  const add = useServerAction(addFromIgdbAction);
  const [addedGames, setAddedGames] = useState<ReadonlyMap<number, string>>(new Map());
  const [adding, setAdding] = useState<MarkedSearchResult | null>(null);

  async function saveGame(game: MarkedSearchResult, values: EntryValues): Promise<void> {
    const result = await add.run(game.igdbId, values);

    if (result.ok) {
      setAddedGames((current) => new Map(current).set(game.igdbId, result.data.gameId));
      setAdding(null);
    }
  }

  return (
    <div className={styles.page}>
      <BackLink href="/library" label={t("game.back")} accessibleLabel={t("game.backLabel")} />

      <div className={styles.heading}>
        <h1 className={styles.title}>{t("add.title")}</h1>
        <p className={styles.subtitle}>{t("add.subtitle")}</p>
      </div>

      <div className={styles.columns}>
        <section aria-label={t("add.searchSection")} className={styles.searchColumn}>
          <label className={styles.searchField}>
            <SearchIcon size={SEARCH_ICON_SIZE} />
            <span className={controls.visuallyHidden}>{t("add.searchLabel")}</span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder={t("add.searchPlaceholder")}
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
            />
          </label>
          <p className={styles.searchHint}>{t("add.searchHint")}</p>

          <IgdbResults
            results={search.results}
            renderAction={(result) => (
              <AddResultAction
                result={result}
                addedGameId={addedGames.get(result.igdbId)}
                pending={add.pending && adding?.igdbId === result.igdbId}
                onAdd={() => setAdding(result)}
              />
            )}
          />

          {search.errorMessage ? <p className={controls.error}>{search.errorMessage}</p> : null}
          {search.noResults ? (
            <p className={styles.message}>{t("add.noResults", { query: search.trimmedQuery })}</p>
          ) : null}
          {search.tooShort ? <p className={styles.tooShort}>{t("add.tooShort")}</p> : null}

          <section className={styles.manualInvite}>
            <h2 className={styles.manualInviteTitle}>{t("add.invite.title")}</h2>
            <p className={styles.manualInviteText}>
              {t("add.invite.text")}
            </p>
            <Link href="/add/manual" className={`${controls.secondary} ${styles.manualLink}`}>
              {t("add.invite.action")}
            </Link>
          </section>
        </section>

        <section aria-label={t("add.manualSection")} className={styles.manualPanel}>
          <div>
            <h2 className={styles.panelTitle}>{t("add.manualTitle")}</h2>
            <p className={styles.panelSubtitle}>{t("add.manualSubtitle")}</p>
          </div>
          <ManualGameSection stores={stores} statusGroups={statusGroups} />
        </section>
      </div>

      {adding ? (
        <IgdbAddDialog
          // Cada juego abre un formulario nuevo, sin lo que quedó del anterior.
          key={adding.igdbId}
          open
          onOpenChange={(open) => setAdding(open ? adding : null)}
          title={adding.title}
          stores={stores}
          statusGroups={statusGroups}
          pending={add.pending}
          errorMessage={add.errorMessage}
          onSave={(values) => void saveGame(adding, values)}
        />
      ) : null}
    </div>
  );
}
