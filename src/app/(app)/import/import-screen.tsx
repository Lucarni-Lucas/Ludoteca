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
import { useImportMatching } from "@/hooks/use-import-matching";
import { useImportReview } from "@/hooks/use-import-review";
import type { ImportSource } from "@/model/import/import-row";
import { type ImportReview, REVIEW_GROUPS, type ReviewGroup } from "@/model/import/review";
import type { Status } from "@/model/status/status";
import type { ImportOverview } from "@/service/import/import-service";

import styles from "./page.module.css";
import { SearchAgain } from "./search-again";

type ImportScreenProps = Readonly<{
  initial: ImportOverview;
  statuses: readonly Status[];
  avatarInitial: string;
  focusSource?: ImportSource;
}>;

/** Abre el primer grupo con algo para decidir; si no queda nada, «Listos». */
function firstGroup(review: ImportReview): ReviewGroup {
  return review.groups.find((view) => view.group !== "ready" && view.games.length > 0)?.group ?? "ready";
}

function summariesOf(overview: ImportOverview): Partial<Record<ImportSource, SourceSummaryView>> {
  return Object.fromEntries(overview.sources.map((source) => [source.source, source]));
}

function sourceBusy(busy: ReturnType<typeof useImportReview>["busy"]): ImportSource | null {
  return busy === "ign" || busy === "playnite" || busy === "steam" ? busy : null;
}

export function ImportScreen({ initial, statuses, avatarInitial, focusSource }: ImportScreenProps) {
  const t = useTranslations();
  const statusText = useStatusText();
  const review = useImportReview(initial);
  const { overview } = review;
  const matching = useImportMatching({ initial: initial.progress, onFinished: review.refresh, onAdvanced: review.refresh });
  const [chosenGroup, setChosenGroup] = useState<ReviewGroup | null>(null);
  const group = chosenGroup ?? firstGroup(overview.review);
  const games = overview.review.groups.find((view) => view.group === group)?.games ?? [];
  const statusOptions: readonly StatusOption[] = useMemo(
    () => statuses.flatMap((status) => (status.systemKey ? [{ statusKey: status.systemKey, name: statusText.name(status) }] : [])),
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

  return (
    <div className={styles.page}>
      <div>
        <PageHeader title={t("import.title")} avatarInitial={avatarInitial} settingsActive />
        <p className={styles.description}>
          <span className={styles.narrowOnly}>{t("import.descriptionShort")}</span>
          <span className={styles.wideOnly}>{t("import.description")}</span>
        </p>
      </div>

      <ImportSources
        summaries={summariesOf(overview)}
        feedback={review.feedback}
        busy={sourceBusy(review.busy)}
        steamAccountId={overview.steam.accountId}
        steamConfigured={overview.steam.configured}
        steamMissingMessage={t("errors.STEAM_NOT_CONFIGURED")}
        focusSource={focusSource}
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
          <h2 id="import-review" className={styles.sectionTitle}>
            {t("import.review.title")}
          </h2>
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
              onDecide={review.decide}
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
    </div>
  );
}
