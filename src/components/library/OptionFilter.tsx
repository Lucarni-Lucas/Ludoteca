import controls from "@/components/ui/controls.module.css";

import styles from "./OptionFilter.module.css";

export type FilterOption = Readonly<{ id: string; label: string; count: number }>;

type OptionFilterProps = Readonly<{
  title: string;
  options: readonly FilterOption[];
  selected: readonly string[];
  onToggle: (id: string) => void;
}>;

export function OptionFilter({ title, options, selected, onToggle }: OptionFilterProps) {
  return (
    <section className={styles.section}>
      <h2 className={`${controls.sectionLabel} ${styles.title}`}>{title}</h2>
      <div className={styles.options}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.option}
            aria-pressed={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
          >
            <span>{option.label}</span>{" "}
            <span className={styles.count}>{option.count}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
