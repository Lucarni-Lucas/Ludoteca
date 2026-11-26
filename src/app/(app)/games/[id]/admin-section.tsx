"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { LinkIgdbDialog } from "@/components/game/LinkIgdbDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { useIgdbSearch } from "@/hooks/use-igdb-search";
import { useRedirectingAction } from "@/hooks/use-redirecting-action";
import { useServerAction } from "@/hooks/use-server-action";
import { isManual, type LibraryGame } from "@/model/game/library-game";

import {
  linkToIgdbAction,
  refreshFromIgdbAction,
  removeFromLibraryAction,
  setGameHiddenAction,
} from "./actions";
import styles from "./page.module.css";

type AdminSectionProps = Readonly<{
  game: LibraryGame;
  onEdit: () => void;
}>;

export function AdminSection({ game, onEdit }: AdminSectionProps) {
  const t = useTranslations("game.admin");
  const [linkOpen, setLinkOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const search = useIgdbSearch();
  const link = useServerAction(linkToIgdbAction);
  const refresh = useServerAction(refreshFromIgdbAction);
  const hidden = useServerAction(setGameHiddenAction);
  const remove = useRedirectingAction(removeFromLibraryAction);
  const manual = isManual(game);
  const errorMessage = refresh.errorMessage ?? hidden.errorMessage;

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
          {t("edit")}
        </button>
        {manual ? (
          <button type="button" className={controls.secondary} onClick={() => setLinkOpen(true)}>
            {t("link")}
          </button>
        ) : (
          <button
            type="button"
            className={controls.secondary}
            disabled={refresh.pending}
            onClick={() => void refresh.run(game.id)}
          >
            {t("refresh")}
          </button>
        )}
        <span className={controls.withHelp}>
          <button
            type="button"
            className={controls.secondary}
            disabled={hidden.pending}
            onClick={() => void hidden.run(game.id, !game.hidden)}
          >
            {game.hidden ? t("unhide") : t("hide")}
          </button>
          <HelpTip help={HELP.hidden} />
        </span>
        <button type="button" className={controls.danger} onClick={() => setRemoveOpen(true)}>
          {t("remove")}
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
        title={t("remove")}
        description={t("removeDescription", { title: game.title })}
        confirmLabel={t("removeConfirm")}
        pending={remove.pending}
        errorMessage={remove.errorMessage}
        onConfirm={() => remove.run(game.id)}
      />
    </div>
  );
}
