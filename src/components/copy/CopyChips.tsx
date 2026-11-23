import { useTranslations } from "next-intl";

import { type Copy, isLost } from "@/model/copy/copy";

import { useCopyText } from "./copy-text";

import styles from "./CopyChips.module.css";

type CopyChipsProps = Readonly<{
  copies: readonly Copy[];
  /** Un juego en «Quiero jugarlo» sin copias todavía no se compró. */
  notBought: boolean;
}>;

export function CopyChips({ copies, notBought }: CopyChipsProps) {
  const t = useTranslations("copy");
  const copyText = useCopyText();

  return (
    <>
      {copies.map((copy) => (
        <span key={copy.id} className={isLost(copy) ? styles.lost : styles.chip}>
          {copyText.cardLabel(copy)}
        </span>
      ))}
      {notBought ? <span className={styles.notBought}>{t("notBought")}</span> : null}
    </>
  );
}
