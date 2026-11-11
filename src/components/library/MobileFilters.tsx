"use client";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { type LibraryFilters, toggleOption } from "@/model/game/filters";
import { gamesCountText } from "@/model/game/summary";
import type { StatusGroupView } from "@/model/status/status";

import { FilterPanel, type FilterPanelProps } from "./FilterPanel";
import styles from "./MobileFilters.module.css";

type MobileFiltersProps = FilterPanelProps &
  Readonly<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groups: readonly StatusGroupView[];
    resultCount: number;
    onClear: () => void;
  }>;

function StatusOptions({
  groups,
  filters,
  onChange,
}: Readonly<{
  groups: readonly StatusGroupView[];
  filters: LibraryFilters;
  onChange: (changes: Partial<LibraryFilters>) => void;
}>) {
  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>Estado</h2>
      {groups.map(({ group, label, statuses }) => (
        <div key={group} className={styles.group}>
          <span className={styles.groupLabel}>{label}</span>
          <div className={styles.pills}>
            {statuses.map((status) => (
              <button
                key={status.id}
                type="button"
                className={controls.pill}
                aria-pressed={filters.statusIds.includes(status.id)}
                onClick={() => onChange({ statusIds: toggleOption(filters.statusIds, status.id) })}
              >
                {status.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Es una ventana y no una ruta: necesita la biblioteca en memoria para decir «Ver 5 juegos». */
export function MobileFilters({ open, onOpenChange, groups, resultCount, onClear, ...panel }: MobileFiltersProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Filtros"
      fullScreen
      headerAction={
        <button type="button" className={styles.clear} onClick={onClear}>
          Limpiar
        </button>
      }
      footer={
        <button type="button" className={`${controls.primary} ${styles.cta}`} onClick={() => onOpenChange(false)}>
          {gamesCountText(resultCount)}
        </button>
      }
    >
      <StatusOptions groups={groups} filters={panel.filters} onChange={panel.onChange} />
      <FilterPanel {...panel} />
    </Modal>
  );
}
