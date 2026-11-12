import controls from "@/components/ui/controls.module.css";
import type { HelpText } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";

import styles from "./OptionFilter.module.css";

export type FilterOption = Readonly<{ id: string; label: string; count: number; help?: HelpText }>;

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
          <span key={option.id} className={styles.optionWithHelp}>
            <button
              type="button"
              className={styles.option}
              aria-pressed={selected.includes(option.id)}
              onClick={() => onToggle(option.id)}
            >
              <span>{option.label}</span>{" "}
              <span className={styles.count}>{option.count}</span>
            </button>
            {option.help ? <HelpTip help={option.help} /> : null}
          </span>
        ))}
      </div>
    </section>
  );
}
