import { useTranslations } from "next-intl";

import { LIBRARY_SORTS, type LibrarySort as SortOption } from "@/model/game/sort";

import styles from "./LibrarySort.module.css";

type LibrarySortProps = Readonly<{
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}>;

export function LibrarySort({ sort, onSortChange }: LibrarySortProps) {
  const t = useTranslations("library.sort");

  return (
    <label className={styles.sort}>
      <span className={styles.label}>{t("label")}</span>
      <select
        className={styles.select}
        value={sort}
        onChange={(event) => onSortChange(event.target.value as SortOption)}
      >
        {LIBRARY_SORTS.map((option) => (
          <option key={option} value={option}>
            {t(`options.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
