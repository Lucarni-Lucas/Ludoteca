"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ConfirmCard } from "@/components/import/ConfirmCard";
import { ImportSources, type SourceSummaryView } from "@/components/import/ImportSources";
import { MatchingProgress } from "@/components/import/MatchingProgress";
import { ReviewNav } from "@/components/import/ReviewNav";
import { ReviewPanel } from "@/components/import/ReviewPanel";
import type { StatusOption } from "@/components/import/ReviewRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { useStatusText } from "@/components/status/status-text";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import controls from "@/components/ui/controls.module.css";
import { Toast } from "@/components/ui/Toast";
import { useImportMatching } from "@/hooks/use-import-matching";
import { useImportReview } from "@/hooks/use-import-review";
import { useToast } from "@/hooks/use-toast";
import { REVIEW_EXPIRY_DAYS } from "@/model/import/expiry";
import type { ImportSource } from "@/model/import/import-row";
import { type ImportReview, REVIEW_GROUPS, type ReviewGroup } from "@/model/import/review";
import type { Status } from "@/model/status/status";
import type { ImportOverview } from "@/service/import/import-service";

import styles from "./page.module.css";

/** Las guías «¿Cómo lo saco?» de cada archivo (design.md §17). */
const GUIDE_HREFS = { ign: "/import/guide/ign", playnite: "/import/guide/playnite" } as const;
import { SearchAgain } from "./search-again";

type ImportScreenProps = Readonly<{
  initial: ImportOverview;
  /** La revisión anterior venció y se descartó al abrir la pantalla. */
  expired: boolean;
  statuses: readonly Status[];
  avatarInitial: string;
  focusSource?: ImportSource;
}>;

/** Abre el primer grupo con algo para decidir; si no queda nada, «Listos para importar». */
function firstGroup(review: ImportReview): ReviewGroup {
  return review.groups.find((view) => view.group !== "ready" && view.games.length > 0)?.group ?? "ready";
}

function summariesOf(overview: ImportOverview): Partial<Record<ImportSource, SourceSummaryView>> {
  return Object.fromEntries(overview.sources.map((source) => [source.source, source]));
}

function sourceBusy(busy: ReturnType<typeof useImportReview>["busy"]): ImportSource | null {
  return busy === "ign" || busy === "playnite" || busy === "steam" ? busy : null;
}

export function ImportScreen({ initial, expired, statuses, avatarInitial, focusSource }: ImportScreenProps) {
  const t = useTranslations();
  const statusText = useStatusText();
  const review = useImportReview(initial);
  const toast = useToast();
  const { overview } = review;
  const matching = useImportMatching({ initial: initial.progress, onFinished: review.refresh, onAdvanced: review.refresh });
  const [chosenGroup, setChosenGroup] = useState<ReviewGroup | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const group = chosenGroup ?? firstGroup(overview.review);
  const games = overview.review.groups.find((view) => view.group === group)?.games ?? [];
  const statusOptions: readonly StatusOption[] = useMemo(
    // Todos los estados activos, también los creados por el usuario (spec «Los estados del usuario»).
    () => statuses.map((status) => ({ id: status.id, name: status.name, systemKey: status.systemKey, label: statusText.name(status) })),
    [statuses, statusText],
  );
  const hasRows = overview.progress.total > 0;
  const matchingVisible = matching.progress.done < matching.progress.total || matching.errorMessage !== null;

  async function afterLoad(next: Promise<ImportOverview | null>) {
    const loaded = await next;

    if (loaded) {
      matching.restart(loaded.progress);
    }
  }

  async function restart() {
    const emptied = await review.discard();

    if (emptied) {
      setRestartOpen(false);
      setChosenGroup(null);
      matching.restart(emptied.progress);
      toast.show(t("import.restart.done"));
    }
  }

  return (
    <div className={styles.page}>
      <div>
        <PageHeader title={t("import.title")} avatarInitial={avatarInitial} settingsActive />
        <p className={styles.description}>
          <span className={styles.narrowOnly}>{t("import.descriptionShort")}</span>
          <span className={styles.wideOnly}>{t("import.description")}</span>
        </p>
      </div>

      {expired ? (
        <p role="status" className={styles.expired}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          {t("import.restart.expired", { days: REVIEW_EXPIRY_DAYS })}
        </p>
      ) : null}

      <ImportSources
        summaries={summariesOf(overview)}
        feedback={review.feedback}
        busy={sourceBusy(review.busy)}
        steamAccountId={overview.steam.accountId}
        steamConfigured={overview.steam.configured}
        steamMissingMessage={t("errors.STEAM_NOT_CONFIGURED")}
        focusSource={focusSource}
        guideHrefs={GUIDE_HREFS}
        onUpload={(source, file) => void afterLoad(review.uploadFile(source, file))}
        onConnectSteam={(profile) => void afterLoad(review.connectSteam(profile))}
        onRefreshSteam={() => void afterLoad(review.refreshSteam())}
      />

      {matchingVisible ? (
        <MatchingProgress
          done={matching.progress.done}
          total={matching.progress.total}
          errorMessage={matching.errorMessage}
          onRetry={matching.retry}
        />
      ) : null}

      {hasRows ? (
        <section className={styles.review} aria-labelledby="import-review">
          <div className={styles.reviewHeader}>
            <h2 id="import-review" className={styles.sectionTitle}>
              {t("import.review.title")}
            </h2>
            <button type="button" className={controls.secondary} disabled={review.busy !== null} onClick={() => setRestartOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {t("import.restart.action")}
            </button>
          </div>
          <div className={styles.columns}>
            <ReviewNav
              groups={REVIEW_GROUPS.map((value) => ({
                group: value,
                count: overview.review.groups.find((view) => view.group === value)?.games.length ?? 0,
              }))}
              current={group}
              upToDate={overview.review.upToDate}
              onSelect={setChosenGroup}
            />
            <ReviewPanel
              key={group}
              group={group}
              games={games}
              statuses={statusOptions}
              busy={review.busy === "decide"}
              steamConnected={overview.steam.accountId !== null}
              errorMessage={review.errorMessage}
              onDecide={async (entryIds, decision) => (await review.decide(entryIds, decision))?.review ?? null}
              onNotify={toast.show}
              renderSearch={(game, close) => (
                <SearchAgain
                  game={game}
                  busy={review.busy === "decide"}
                  onClose={close}
                  onPick={(result) => void review.searchAgain(game.entryId, result).then((saved) => saved && close())}
                />
              )}
            />
          </div>
        </section>
      ) : null}

      {hasRows || review.summary ? (
        <ConfirmCard
          ready={overview.ready}
          confirming={review.busy === "confirm"}
          summary={review.summary}
          errorMessage={null}
          onConfirm={() => void review.confirm()}
        />
      ) : null}

      <ConfirmDialog
        open={restartOpen}
        onOpenChange={setRestartOpen}
        title={t("import.restart.title")}
        description={t("import.restart.description")}
        confirmLabel={t("import.restart.action")}
        pending={review.busy === "decide"}
        errorMessage={restartOpen ? review.errorMessage : null}
        onConfirm={() => void restart()}
      />

      <Toast message={toast.message} onExpire={toast.clear} />
    </div>
  );
}
