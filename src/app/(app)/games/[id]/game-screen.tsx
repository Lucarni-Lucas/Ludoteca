"use client";

import { useState } from "react";

import { EditGameDialog, type EditGameValues } from "@/components/game/EditGameDialog";
import { GameCover } from "@/components/game/GameCover";
import { GameFacts, GameHeaderFacts } from "@/components/game/GameFacts";
import { PlayedHoursDialog } from "@/components/game/PlayedHoursDialog";
import { ScoreControl } from "@/components/game/ScoreControl";
import { BackLink } from "@/components/layout/BackLink";
import { StatusCard } from "@/components/status/StatusCard";
import { StatusDialog } from "@/components/status/StatusDialog";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { useServerAction } from "@/hooks/use-server-action";
import { effectiveCover, isManual, type LibraryGame } from "@/model/game/library-game";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

import { uploadCoverAction } from "../../add/actions";
import { changeStatusAction, setPlayedHoursAction, setScoreAction, updateCorrectionsAction } from "./actions";
import { AdminSection } from "./admin-section";
import { CopiesSection } from "./copies-section";
import styles from "./page.module.css";

type GameScreenProps = Readonly<{
  game: LibraryGame;
  statusGroups: readonly StatusGroupView[];
  stores: readonly Store[];
  openCopyDialog: boolean;
}>;

function metaText(game: LibraryGame): string {
  return [game.year, game.developer].filter(Boolean).join(" · ");
}

export function GameScreen({ game, statusGroups, stores, openCopyDialog }: GameScreenProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [playedOpen, setPlayedOpen] = useState(false);
  const savePlayed = useServerAction(setPlayedHoursAction);
  const changeStatus = useServerAction(changeStatusAction);
  const setScore = useServerAction(setScoreAction);
  const saveCorrections = useServerAction(updateCorrectionsAction);
  const upload = useServerAction(uploadCoverAction);

  async function savePlayedHours(hours: number | null): Promise<void> {
    const result = await savePlayed.run(game.id, hours);

    if (result.ok) {
      setPlayedOpen(false);
    }
  }

  async function saveStatus(statusId: string): Promise<void> {
    const result = await changeStatus.run(game.id, statusId);

    if (result.ok) {
      setStatusOpen(false);
    }
  }

  async function saveEdit(values: EditGameValues): Promise<void> {
    const result = await saveCorrections.run(game.id, values);

    if (result.ok) {
      setEditOpen(false);
    }
  }

  async function uploadCover(file: File): Promise<string | undefined> {
    const formData = new FormData();
    formData.set("cover", file);
    const result = await upload.run(formData);

    return result.ok ? result.data : undefined;
  }

  return (
    <div className={styles.page}>
      <BackLink href="/library" label="Biblioteca" accessibleLabel="Volver a la biblioteca" />

      <div className={styles.layout}>
        <div className={styles.aside}>
          <div className={styles.cover}>
            <GameCover title={game.title} coverUrl={effectiveCover(game)} year={game.year} variant="detail" />
          </div>
          <div className={styles.copies}>
            <CopiesSection gameId={game.id} copies={game.copies} stores={stores} openAddDialog={openCopyDialog} />
          </div>
          <div className={styles.facts}>
            <GameFacts game={game} onEdit={() => setEditOpen(true)} onEditPlayed={() => setPlayedOpen(true)} />
          </div>
        </div>

        <div className={styles.main}>
          <div className={styles.titles}>
            <h1 className={styles.title}>{game.title}</h1>
            <p className={styles.meta}>{metaText(game)}</p>
            {isManual(game) ? (
              <span className={styles.badgeWithHelp}>
                <span className={styles.badge}>A MANO</span>
                <HelpTip help={HELP.manual} />
              </span>
            ) : null}
            <GameHeaderFacts game={game} onEdit={() => setEditOpen(true)} onEditPlayed={() => setPlayedOpen(true)} />
          </div>

          <div className={styles.cards}>
            <div className={styles.status}>
              <StatusCard status={game.status} statusSince={game.statusSince} onChange={() => setStatusOpen(true)} />
            </div>
            <div className={styles.score}>
              <ScoreControl
                score={game.score}
                errorMessage={setScore.errorMessage}
                onSave={(score) => void setScore.run(game.id, score)}
              />
            </div>
          </div>

          <AdminSection game={game} onEdit={() => setEditOpen(true)} />
        </div>
      </div>

      {statusOpen ? (
        <StatusDialog
          open
          onOpenChange={setStatusOpen}
          title={game.title}
          current={game.status}
          groups={statusGroups}
          pending={changeStatus.pending}
          errorMessage={changeStatus.errorMessage}
          onSave={(statusId) => void saveStatus(statusId)}
        />
      ) : null}

      {playedOpen ? (
        <PlayedHoursDialog
          open
          onOpenChange={setPlayedOpen}
          manualPlayedMinutes={game.manualPlayedMinutes}
          pending={savePlayed.pending}
          errorMessage={savePlayed.errorMessage}
          onSave={(hours) => void savePlayedHours(hours)}
        />
      ) : null}

      {editOpen ? (
        <EditGameDialog
          open
          onOpenChange={setEditOpen}
          game={game}
          pending={saveCorrections.pending}
          errorMessage={saveCorrections.errorMessage}
          uploading={upload.pending}
          uploadError={upload.errorMessage}
          onUploadCover={uploadCover}
          onSave={(values) => void saveEdit(values)}
        />
      ) : null}
    </div>
  );
}
