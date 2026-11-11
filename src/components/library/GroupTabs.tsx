import controls from "@/components/ui/controls.module.css";
import { type LibraryFilters, toggleOption } from "@/model/game/filters";
import type { LibraryCounts } from "@/model/game/summary";
import type { StatusGroupView } from "@/model/status/status";

import styles from "./GroupTabs.module.css";

type GroupTabsProps = Readonly<{
  groups: readonly StatusGroupView[];
  filters: LibraryFilters;
  counts: LibraryCounts;
  onChange: (changes: Partial<LibraryFilters>) => void;
}>;

/** En el celu los grupos se suman entre sí, igual que en PC. */
export function GroupTabs({ groups, filters, counts, onChange }: GroupTabsProps) {
  const noneSelected = filters.groups.length === 0 && filters.statusIds.length === 0;

  return (
    <div className={styles.tabs}>
      <button
        type="button"
        className={controls.pill}
        aria-pressed={noneSelected}
        onClick={() => onChange({ groups: [], statusIds: [] })}
      >
        Todos{" "}
        <span className={styles.count}>{counts.total}</span>
      </button>
      {groups.map(({ group, label }) => (
        <button
          key={group}
          type="button"
          className={controls.pill}
          aria-pressed={filters.groups.includes(group)}
          onClick={() => onChange({ groups: toggleOption(filters.groups, group) })}
        >
          {label}{" "}
          <span className={styles.count}>{counts.groups[group] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
