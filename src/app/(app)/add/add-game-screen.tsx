"use client";

import Link from "next/link";
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
      <BackLink href="/library" label="Biblioteca" accessibleLabel="Volver a la biblioteca" />

      <div className={styles.heading}>
        <h1 className={styles.title}>Agregar juego</h1>
        <p className={styles.subtitle}>Buscalo en IGDB. Si no aparece, cargalo a mano en el panel de la derecha.</p>
      </div>

      <div className={styles.columns}>
        <section aria-label="Buscar en IGDB" className={styles.searchColumn}>
          <label className={styles.searchField}>
            <SearchIcon size={SEARCH_ICON_SIZE} />
            <span className={controls.visuallyHidden}>Buscar juego</span>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Escribí 2 o 3 letras"
              value={search.query}
              onChange={(event) => search.setQuery(event.target.value)}
            />
          </label>
          <p className={styles.searchHint}>Buscamos en IGDB mientras escribís.</p>

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
            <p className={styles.message}>No encontramos “{search.trimmedQuery}” en IGDB</p>
          ) : null}
          {search.tooShort ? <p className={styles.tooShort}>Escribí al menos 2 letras</p> : null}

          <section className={styles.manualInvite}>
            <h2 className={styles.manualInviteTitle}>¿No aparece?</h2>
            <p className={styles.manualInviteText}>
              Juegos de itch.io, game jams, mods o lo que sea: cargalo a mano con título, link y portada.
            </p>
            <Link href="/add/manual" className={`${controls.secondary} ${styles.manualLink}`}>
              Agregar a mano
            </Link>
          </section>
        </section>

        <section aria-label="Agregar a mano" className={styles.manualPanel}>
          <div>
            <h2 className={styles.panelTitle}>¿No aparece? Cargalo a mano</h2>
            <p className={styles.panelSubtitle}>Para indies de itch.io, game jams o mods.</p>
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
