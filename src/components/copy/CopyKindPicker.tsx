import controls from "@/components/ui/controls.module.css";
import { HELP, type HelpText } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { COPY_KIND_LABELS, COPY_KINDS, type CopyKind } from "@/model/copy/copy";

import styles from "./CopyKindPicker.module.css";

const KIND_HELP: Partial<Record<CopyKind, HelpText>> = { family: HELP.family, other: HELP.other };

type CopyKindPickerProps = Readonly<{
  value: CopyKind;
  onChange: (kind: CopyKind) => void;
}>;

export function CopyKindPicker({ value, onChange }: CopyKindPickerProps) {
  return (
    <div className={styles.picker} role="group" aria-label="Cómo lo tenés">
      <span className={styles.label} aria-hidden="true">
        Cómo lo tenés
      </span>
      <div className={styles.options}>
        {COPY_KINDS.map((kind) => {
          const help = KIND_HELP[kind];

          return (
            <span key={kind} className={styles.option}>
              <button
                type="button"
                className={controls.pill}
                aria-pressed={value === kind}
                onClick={() => onChange(kind)}
              >
                {COPY_KIND_LABELS[kind]}
              </button>
              {help ? <HelpTip help={help} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
