import type { ChangeEvent, ReactNode } from "react";

import controls from "@/components/ui/controls.module.css";
import { isSameRange, NO_RANGE, type NumberRange, type RangePreset } from "@/model/game/filters";

import styles from "./RangeFilter.module.css";

type RangeFilterProps = Readonly<{
  title: string;
  aside?: string;
  unit?: string;
  range: NumberRange;
  presets?: readonly RangePreset[];
  minPlaceholder: string;
  maxPlaceholder: string;
  step?: string;
  hint?: ReactNode;
  onChange: (range: NumberRange) => void;
}>;

function toBound(event: ChangeEvent<HTMLInputElement>): number | null {
  const { value } = event.target;
  return value === "" ? null : Number(value);
}

export function RangeFilter({
  title,
  aside,
  unit,
  range,
  presets = [],
  minPlaceholder,
  maxPlaceholder,
  step,
  hint,
  onChange,
}: RangeFilterProps) {
  const suffix = unit ? ` (${unit})` : "";

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h2 className={controls.sectionLabel}>{title}</h2>
        {aside ? <span className={styles.aside}>{aside}</span> : null}
      </div>
      <div className={styles.fields}>
        <label className={styles.field}>
          Desde{suffix}
          <input
            className={styles.input}
            type="number"
            min="0"
            step={step}
            inputMode="decimal"
            placeholder={minPlaceholder}
            value={range.min ?? ""}
            onChange={(event) => onChange({ ...range, min: toBound(event) })}
          />
        </label>
        <label className={styles.field}>
          Hasta{suffix}
          <input
            className={styles.input}
            type="number"
            min="0"
            step={step}
            inputMode="decimal"
            placeholder={maxPlaceholder}
            value={range.max ?? ""}
            onChange={(event) => onChange({ ...range, max: toBound(event) })}
          />
        </label>
      </div>
      {presets.length > 0 ? (
        <div className={styles.presets}>
          {presets.map((preset) => {
            const active = isSameRange(range, preset.range);

            return (
              <button
                key={preset.label}
                type="button"
                className={styles.preset}
                aria-pressed={active}
                onClick={() => onChange(active ? NO_RANGE : preset.range)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </section>
  );
}
