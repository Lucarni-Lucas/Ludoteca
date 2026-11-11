import { type Copy, copyCardLabel, isLost } from "@/model/copy/copy";

import styles from "./CopyChips.module.css";

type CopyChipsProps = Readonly<{
  copies: readonly Copy[];
  /** Un juego en «Quiero jugarlo» sin copias todavía no se compró. */
  notBought: boolean;
}>;

export function CopyChips({ copies, notBought }: CopyChipsProps) {
  return (
    <>
      {copies.map((copy) => (
        <span key={copy.id} className={isLost(copy) ? styles.lost : styles.chip}>
          {copyCardLabel(copy)}
        </span>
      ))}
      {notBought ? <span className={styles.notBought}>Sin comprar</span> : null}
    </>
  );
}
