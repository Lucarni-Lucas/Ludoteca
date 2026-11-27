import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { HIDDEN_FILTERS, type HiddenFilter as HiddenFilterValue } from "@/model/game/filters";

import styles from "./OptionFilter.module.css";

type HiddenFilterProps = Readonly<{
  value: HiddenFilterValue;
  onChange: (value: HiddenFilterValue) => void;
}>;

/** «No mostrar», «Mostrar ocultos» o «Solo ocultos»: una sola a la vez (`04` design.md §22). */
export function HiddenFilter({ value, onChange }: HiddenFilterProps) {
  const t = useTranslations("filters");

  return (
    <section className={styles.section}>
      <span className={`${controls.labelWithHelp} ${styles.title}`}>
        <h2 className={controls.sectionLabel}>{t("hidden.title")}</h2>
        <HelpTip help={HELP.hidden} />
      </span>
      <div role="group" aria-label={t("hidden.title")} className={styles.options}>
        {HIDDEN_FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.option}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {t(`hidden.${option}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
