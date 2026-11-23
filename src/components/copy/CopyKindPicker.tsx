import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import { HELP, type HelpText } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { COPY_KINDS, type CopyKind } from "@/model/copy/copy";

import { useCopyText } from "./copy-text";
import styles from "./CopyKindPicker.module.css";

const KIND_HELP: Partial<Record<CopyKind, HelpText>> = { family: HELP.family, other: HELP.other };

type CopyKindPickerProps = Readonly<{
  value: CopyKind;
  onChange: (kind: CopyKind) => void;
}>;

export function CopyKindPicker({ value, onChange }: CopyKindPickerProps) {
  const t = useTranslations("copy.fields");
  const copyText = useCopyText();

  return (
    <div className={styles.picker} role="group" aria-label={t("kind")}>
      <span className={styles.label} aria-hidden="true">
        {t("kind")}
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
                {copyText.kind(kind)}
              </button>
              {help ? <HelpTip help={help} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
