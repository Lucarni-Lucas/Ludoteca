import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import { HELP } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { PlusIcon } from "@/components/ui/icons";
import { useDateFormat } from "@/i18n/dates";
import { type Copy, isLost } from "@/model/copy/copy";

import { useCopyText } from "./copy-text";
import styles from "./CopyList.module.css";

const PLUS_ICON_SIZE = 15;
const STORE_MARK_LENGTH = 3;

type CopyListProps = Readonly<{
  copies: readonly Copy[];
  onAdd: () => void;
  onMarkLost: (copy: Copy) => void;
  onRecover: (copy: Copy) => void;
  onRemove: (copy: Copy) => void;
}>;

function CopyDetail({ copy }: Readonly<{ copy: Copy }>) {
  const copyText = useCopyText();
  const { monthYear } = useDateFormat();
  const label = copyText.detailLabel(copy);
  const date = copy.acquiredOn ? ` · ${monthYear(copy.acquiredOn)}` : "";
  const lost = isLost(copy);

  return (
    <>
      <p className={lost ? styles.lostDetail : styles.detail}>
        {label}
        {date}
      </p>
      {lost && copy.lostReason ? <p className={styles.detail}>{copyText.lostReason(copy.lostReason)}</p> : null}
    </>
  );
}

export function CopyList({ copies, onAdd, onMarkLost, onRecover, onRemove }: CopyListProps) {
  const t = useTranslations("copy");

  return (
    <section className={styles.section}>
      <h2 className={controls.sectionLabel}>{t("where")}</h2>
      {copies.map((copy) => (
        <div key={copy.id} className={styles.card}>
          <div className={styles.main}>
            <span aria-hidden="true" className={styles.mark}>
              {copy.storeName.slice(0, STORE_MARK_LENGTH).toUpperCase()}
            </span>
            <div className={styles.text}>
              <p className={styles.store}>{copy.storeName}</p>
              <CopyDetail copy={copy} />
            </div>
          </div>
          <div className={styles.actions}>
            {isLost(copy) ? (
              <button type="button" className={controls.ghost} onClick={() => onRecover(copy)}>
                {t("recover")}
              </button>
            ) : (
              <span className={controls.withHelp}>
                <button type="button" className={controls.ghost} onClick={() => onMarkLost(copy)}>
                  {t("markLost")}
                </button>
                <HelpTip help={HELP.lost} />
              </span>
            )}
            <button
              type="button"
              className={controls.ghost}
              aria-label={t("removeLabel", { store: copy.storeName })}
              onClick={() => onRemove(copy)}
            >
              {t("remove")}
            </button>
          </div>
        </div>
      ))}
      <button type="button" className={controls.dashed} onClick={onAdd}>
        <PlusIcon size={PLUS_ICON_SIZE} />
        {t("addAnother")}
      </button>
    </section>
  );
}
