"use client";

import { useTranslations } from "next-intl";

import { useStatusText } from "@/components/status/status-text";
import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import { type LibraryFilters, toggleOption } from "@/model/game/filters";
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
  const t = useTranslations("status");
  const statusText = useStatusText();

  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>{t("title")}</h2>
      {groups.map(({ group, statuses }) => (
        <div key={group} className={styles.group}>
          <span className={styles.groupLabel}>{statusText.group(group)}</span>
          <div className={styles.pills}>
            {statuses.map((status) => (
              <button
                key={status.id}
                type="button"
                className={controls.pill}
                aria-pressed={filters.statusIds.includes(status.id)}
                onClick={() => onChange({ statusIds: toggleOption(filters.statusIds, status.id) })}
              >
                {statusText.name(status)}
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
  const t = useTranslations("filters");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      fullScreen
      headerAction={
        <button type="button" className={styles.clear} onClick={onClear}>
          {t("clear")}
        </button>
      }
      footer={
        <button type="button" className={`${controls.primary} ${styles.cta}`} onClick={() => onOpenChange(false)}>
          {t("seeGames", { count: resultCount })}
        </button>
      }
    >
      <StatusOptions groups={groups} filters={panel.filters} onChange={panel.onChange} />
      <FilterPanel {...panel} />
    </Modal>
  );
}
