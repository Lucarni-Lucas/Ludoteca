import { useTranslations } from "next-intl";

import { useStatusText } from "@/components/status/status-text";
import controls from "@/components/ui/controls.module.css";
import type { LibraryFilters } from "@/model/game/filters";
import { toggleOption } from "@/model/game/filters";
import type { LibraryCounts } from "@/model/game/summary";
import type { StatusGroupView } from "@/model/status/status";

import styles from "./StatusFilters.module.css";

type StatusFiltersProps = Readonly<{
  groups: readonly StatusGroupView[];
  filters: LibraryFilters;
  counts: LibraryCounts;
  onChange: (changes: Partial<LibraryFilters>) => void;
}>;

function CountedPill({
  label,
  count,
  active,
  onClick,
}: Readonly<{ label: string; count: number; active: boolean; onClick: () => void }>) {
  return (
    <button type="button" className={`${controls.pill} ${styles.pill}`} aria-pressed={active} onClick={onClick}>
      {label}{" "}
      <span className={styles.count}>{count}</span>
    </button>
  );
}

/** En PC: «Todos», cada grupo y cada estado. Se pueden sumar varios, y «Todos» los saca. */
export function StatusFilters({ groups, filters, counts, onChange }: StatusFiltersProps) {
  const t = useTranslations("filters");
  const statusText = useStatusText();
  const noneSelected = filters.statusIds.length === 0 && filters.groups.length === 0;

  return (
    <div className={styles.bar}>
      <CountedPill
        label={t("all")}
        count={counts.total}
        active={noneSelected}
        onClick={() => onChange({ statusIds: [], groups: [] })}
      />
      {groups.map(({ group, statuses }) => (
        <div key={group} className={styles.group}>
          <button
            type="button"
            className={styles.groupButton}
            aria-pressed={filters.groups.includes(group)}
            onClick={() => onChange({ groups: toggleOption(filters.groups, group) })}
          >
            {statusText.group(group)}
          </button>
          {statuses.map((status) => (
            <CountedPill
              key={status.id}
              label={statusText.name(status)}
              count={counts.statuses[status.id] ?? 0}
              active={filters.statusIds.includes(status.id)}
              onClick={() => onChange({ statusIds: toggleOption(filters.statusIds, status.id) })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
