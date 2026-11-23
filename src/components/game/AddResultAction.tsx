import Link from "next/link";
import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import type { MarkedSearchResult } from "@/model/game/add-game";

import styles from "./AddResultAction.module.css";

type AddResultActionProps = Readonly<{
  result: MarkedSearchResult;
  addedGameId: string | undefined;
  pending: boolean;
  onAdd: () => void;
}>;

const MARK_KEYS = { in_library: "inLibrary", wishlist: "wishlist" } as const;

export function AddResultAction({ result, addedGameId, pending, onAdd }: AddResultActionProps) {
  const t = useTranslations();

  if (addedGameId) {
    return (
      <Link href={`/games/${addedGameId}`} className={`${controls.secondary} ${styles.added}`}>
        {t("add.result.added")}
      </Link>
    );
  }

  if (result.mark.kind === "new") {
    return (
      <button type="button" className={controls.primary} disabled={pending} onClick={onAdd}>
        {t("add.result.add")}
      </button>
    );
  }

  return (
    <div className={styles.owned}>
      <span className={styles.mark}>{t(`add.result.${MARK_KEYS[result.mark.kind]}`)}</span>
      <Link href={`/games/${result.mark.gameId}?copy=new`} className={controls.ghost}>
        {t("copy.addFirst")}
      </Link>
    </div>
  );
}
