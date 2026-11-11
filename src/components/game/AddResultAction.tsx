import Link from "next/link";

import controls from "@/components/ui/controls.module.css";
import type { MarkedSearchResult } from "@/model/game/add-game";

import styles from "./AddResultAction.module.css";

type AddResultActionProps = Readonly<{
  result: MarkedSearchResult;
  addedGameId: string | undefined;
  pending: boolean;
  onAdd: () => void;
}>;

const MARK_LABELS = { in_library: "En tu biblioteca", wishlist: "En «Quiero jugarlo»" } as const;

export function AddResultAction({ result, addedGameId, pending, onAdd }: AddResultActionProps) {
  if (addedGameId) {
    return (
      <Link href={`/games/${addedGameId}`} className={`${controls.secondary} ${styles.added}`}>
        Agregado
      </Link>
    );
  }

  if (result.mark.kind === "new") {
    return (
      <button type="button" className={controls.primary} disabled={pending} onClick={onAdd}>
        Agregar
      </button>
    );
  }

  return (
    <div className={styles.owned}>
      <span className={styles.mark}>{MARK_LABELS[result.mark.kind]}</span>
      <Link href={`/games/${result.mark.gameId}?copy=new`} className={controls.ghost}>
        Agregar una copia
      </Link>
    </div>
  );
}
