import { useTranslations } from "next-intl";

import type { ReviewGroup } from "@/model/import/review";

import styles from "./ReviewNav.module.css";

export type GroupCount = Readonly<{ group: ReviewGroup; count: number }>;

type ReviewNavProps = Readonly<{
  groups: readonly GroupCount[];
  current: ReviewGroup;
  upToDate: number;
  onSelect: (group: ReviewGroup) => void;
}>;

/** En PC, la lista de grupos como el menú de Ajustes; en el celu, botones que bajan de renglón. */
export function ReviewNav({ groups, current, upToDate, onSelect }: ReviewNavProps) {
  const t = useTranslations("import");

  return (
    <div className={styles.wrapper}>
      <nav aria-label={t("review.nav")} className={styles.nav}>
        {groups.map(({ group, count }) => (
          <button
            key={group}
            type="button"
            aria-current={group === current ? "true" : undefined}
            className={group === "ready" ? `${styles.item} ${styles.ready}` : styles.item}
            onClick={() => onSelect(group)}
          >
            <span className={styles.text}>
              <span className={styles.name}>{t(`groups.${group}.name`)}</span>
              <span className={styles.hint}>{t(`groups.${group}.hint`)}</span>
            </span>
            <span className={group === "ready" ? `${styles.count} ${styles.readyCount}` : styles.count}>{count}</span>
          </button>
        ))}
      </nav>
      {upToDate > 0 ? <p className={styles.upToDate}>{t("review.upToDate", { count: upToDate })}</p> : null}
    </div>
  );
}
