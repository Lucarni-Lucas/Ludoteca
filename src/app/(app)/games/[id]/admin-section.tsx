"use client";

import { useState } from "react";

import { LinkIgdbDialog } from "@/components/game/LinkIgdbDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import controls from "@/components/ui/controls.module.css";
import { useIgdbSearch } from "@/hooks/use-igdb-search";
import { useRedirectingAction } from "@/hooks/use-redirecting-action";
import { useServerAction } from "@/hooks/use-server-action";
import { isManual, type LibraryGame } from "@/model/game/library-game";

import {
  linkToIgdbAction,
  refreshFromIgdbAction,
  removeFromLibraryAction,
  setGameNotInterestedAction,
} from "./actions";
import styles from "./page.module.css";

type AdminSectionProps = Readonly<{
  game: LibraryGame;
  onEdit: () => void;
}>;

export function AdminSection({ game, onEdit }: AdminSectionProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const search = useIgdbSearch();
  const link = useServerAction(linkToIgdbAction);
  const refresh = useServerAction(refreshFromIgdbAction);
  const notInterested = useServerAction(setGameNotInterestedAction);
  const remove = useRedirectingAction(removeFromLibraryAction);
  const manual = isManual(game);
  const errorMessage = refresh.errorMessage ?? notInterested.errorMessage;

  async function linkGame(igdbId: number): Promise<void> {
    const result = await link.run(game.id, igdbId);

    if (result.ok) {
      setLinkOpen(false);
    }
  }

  return (
    <div className={styles.admin}>
      <div className={styles.adminButtons}>
        <button type="button" className={controls.secondary} onClick={onEdit}>
          Editar
        </button>
        {manual ? (
          <button type="button" className={controls.secondary} onClick={() => setLinkOpen(true)}>
            Vincular con IGDB
          </button>
        ) : (
          <button
            type="button"
            className={controls.secondary}
            disabled={refresh.pending}
            onClick={() => void refresh.run(game.id)}
          >
            Actualizar datos
          </button>
        )}
        <button
          type="button"
          className={controls.secondary}
          disabled={notInterested.pending}
          onClick={() => void notInterested.run(game.id, !game.notInterested)}
        >
          {game.notInterested ? "Quitar «Sin interés»" : "Marcar sin interés"}
        </button>
        <button type="button" className={controls.danger} onClick={() => setRemoveOpen(true)}>
          Quitar de la biblioteca
        </button>
      </div>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}

      <LinkIgdbDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        query={search.query}
        results={search.results}
        noResults={search.noResults}
        searchError={search.errorMessage}
        pending={link.pending}
        errorMessage={link.errorMessage}
        onQueryChange={search.setQuery}
        onLink={(igdbId) => void linkGame(igdbId)}
      />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Quitar de la biblioteca"
        description={`Se borra ${game.title} con sus copias, su puntaje y su historial. No se puede deshacer.`}
        confirmLabel="Quitar"
        pending={remove.pending}
        errorMessage={remove.errorMessage}
        onConfirm={() => remove.run(game.id)}
      />
    </div>
  );
}
