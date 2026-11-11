import { type CopyKind, isOwnCopyKind } from "@/model/copy/copy";
import {
  BACKLOG_KEY,
  findStatusByKey,
  isWishlist,
  planStatusChange,
  type Status,
  type StatusChangePlan,
} from "@/model/status/status";

export type NewCopy = Readonly<{
  storeId: string;
  kind: CopyKind;
  acquiredOn: string | null;
  familyOwner: string | null;
}>;

export type NewCopyDetails = Omit<NewCopy, "storeId">;

/** «De quién es» solo tiene sentido en una copia Familia. */
export function buildNewCopy(storeId: string, details: NewCopyDetails): NewCopy {
  return {
    storeId,
    kind: details.kind,
    acquiredOn: details.acquiredOn,
    familyOwner: details.kind === "family" ? details.familyOwner : null,
  };
}

/** Comprar algo de «Quiero jugarlo» lo pasa a «Pendiente»; una suscripción o una familia, no. */
export function planStatusAfterNewCopy(
  game: Readonly<{ status: Pick<Status, "id" | "systemKey"> }>,
  kind: CopyKind,
  statuses: readonly Status[],
  today: string,
): StatusChangePlan | null {
  const backlog = findStatusByKey(statuses, BACKLOG_KEY);

  return isOwnCopyKind(kind) && isWishlist(game.status) && backlog ? planStatusChange(game, backlog, today) : null;
}

export function movedToNotice(title: string, statusName: string): string {
  return `${title} pasó a «${statusName}»`;
}
