"use client";

import { useMemo, useState } from "react";

import { AddGameShortcut } from "@/components/layout/AddGameShortcut";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterPanel } from "@/components/library/FilterPanel";
import { GroupTabs } from "@/components/library/GroupTabs";
import { LibraryEmpty } from "@/components/library/LibraryEmpty";
import { LibraryGrid } from "@/components/library/LibraryGrid";
import { LibrarySort } from "@/components/library/LibrarySort";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { MobileFilters } from "@/components/library/MobileFilters";
import { NoResults } from "@/components/library/NoResults";
import { SelectionBar } from "@/components/library/SelectionBar";
import { StatusFilters } from "@/components/library/StatusFilters";
import { FilterIcon } from "@/components/ui/icons";
import { useLibraryFilters } from "@/hooks/use-library-filters";
import { useSelection } from "@/hooks/use-selection";
import { useServerAction } from "@/hooks/use-server-action";
import { filterLibrary } from "@/model/game/filters";
import type { LibraryGame } from "@/model/game/library-game";
import { sortLibrary } from "@/model/game/sort";
import { countLibraryOptions, listStoreOptions, summarizeLibrary, summaryText } from "@/model/game/summary";
import type { StatusGroupView } from "@/model/status/status";

import { setNotInterestedAction } from "./actions";
import styles from "./page.module.css";

const FILTER_ICON_SIZE = 20;

type LibraryScreenProps = Readonly<{
  games: readonly LibraryGame[];
  statusGroups: readonly StatusGroupView[];
  avatarInitial: string;
  initialSearch: string;
}>;

function Header({
  avatarInitial,
  onOpenFilters,
}: Readonly<{ avatarInitial: string; onOpenFilters?: () => void }>) {
  return (
    <PageHeader
      title="Biblioteca"
      wideTitle="Tu biblioteca"
      avatarInitial={avatarInitial}
      actions={
        <>
          {onOpenFilters ? (
            <button type="button" className={styles.filtersButton} aria-label="Filtros" onClick={onOpenFilters}>
              <FilterIcon size={FILTER_ICON_SIZE} />
            </button>
          ) : null}
          <AddGameShortcut />
        </>
      }
    />
  );
}

export function LibraryScreen({ games, statusGroups, avatarInitial, initialSearch }: LibraryScreenProps) {
  const { filters, sort, setFilters, setSort, clearFilters } = useLibraryFilters(initialSearch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const selection = useSelection();
  const notInterested = useServerAction(setNotInterestedAction);

  const results = useMemo(() => sortLibrary(filterLibrary(games, filters), sort), [games, filters, sort]);
  const counts = useMemo(
    () => countLibraryOptions(games, filters.showNotInterested),
    [games, filters.showNotInterested],
  );
  const stores = useMemo(() => listStoreOptions(games), [games]);
  const summary = useMemo(() => summaryText(summarizeLibrary(games)), [games]);

  if (games.length === 0) {
    return (
      <div className={styles.page}>
        <Header avatarInitial={avatarInitial} />
        <LibraryEmpty />
      </div>
    );
  }

  const panel = { filters, counts, stores, onChange: setFilters };
  const selectedGames = results.filter((game) => selection.selectedIds.has(game.id));
  // Si todo lo elegido ya está oculto, la acción útil es volver a mostrarlo.
  const unmark = selectedGames.length > 0 && selectedGames.every((game) => game.notInterested);

  async function applyMark(): Promise<void> {
    const result = await notInterested.run([...selection.selectedIds], !unmark);

    if (result.ok) {
      selection.stop();
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div className={styles.heading}>
          <Header avatarInitial={avatarInitial} onOpenFilters={() => setFiltersOpen(true)} />
          <p className={styles.summary}>{summary}</p>
        </div>
        <div className={styles.sort}>
          <LibrarySort sort={sort} onSortChange={setSort} />
        </div>
        <div className={styles.toolbar}>
          <LibraryToolbar
            title={filters.title}
            onTitleChange={(title) => setFilters({ title })}
            onStartSelection={selection.start}
          />
        </div>
      </div>

      {selection.active ? (
        <SelectionBar
          count={selection.selectedIds.size}
          markLabel={unmark ? "Quitar «Sin interés»" : "Marcar sin interés"}
          pending={notInterested.pending}
          errorMessage={notInterested.errorMessage}
          onMark={() => void applyMark()}
          onCancel={selection.stop}
        />
      ) : null}

      <div className={styles.columns}>
        <aside className={styles.filters}>
          <FilterPanel {...panel} />
        </aside>

        <div className={styles.results}>
          <div className={styles.wideOnly}>
            <StatusFilters groups={statusGroups} filters={filters} counts={counts} onChange={setFilters} />
          </div>
          <div className={styles.narrowOnly}>
            <GroupTabs groups={statusGroups} filters={filters} counts={counts} onChange={setFilters} />
          </div>

          {results.length > 0 ? (
            <LibraryGrid
              games={results}
              selectedIds={selection.active ? selection.selectedIds : undefined}
              onToggleSelected={selection.active ? selection.toggle : undefined}
            />
          ) : (
            <NoResults onClear={clearFilters} />
          )}
        </div>
      </div>

      <MobileFilters
        {...panel}
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        groups={statusGroups}
        resultCount={results.length}
        onClear={clearFilters}
      />
    </div>
  );
}
