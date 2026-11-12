import { type CopyKind, isOwnCopyKind, MAX_KIND_DETAIL_LENGTH } from "@/model/copy/copy";
import { CopyStoreMissingError, KindDetailTooLongError } from "@/model/copy/errors";
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
  kindDetail?: string;
}>;

export type NewCopyDetails = Omit<NewCopy, "storeId" | "kindDetail"> & Readonly<{ kindDetail?: string | null }>;

/** Se cuentan caracteres y no unidades de UTF-16: un emoji es uno solo. */
function characterCount(text: string): number {
  return Array.from(text).length;
}

/** El detalle solo tiene sentido en una copia Otro, y es opcional. */
function kindDetailOf(details: NewCopyDetails): Pick<NewCopy, "kindDetail"> {
  if (details.kind !== "other" || !details.kindDetail) {
    return {};
  }

  if (characterCount(details.kindDetail) > MAX_KIND_DETAIL_LENGTH) {
    throw new KindDetailTooLongError();
  }

  return { kindDetail: details.kindDetail };
}

/** Los datos de una copia ya validados, listos para sumarles la tienda. */
export type CopyDetails = Omit<NewCopy, "storeId">;

/**
 * «De quién es» solo tiene sentido en una copia Familia, y el detalle solo en una Otro.
 * Va antes de resolver la tienda: una tienda «Otra» se crea al resolverla, y no debe quedar si la copia no se guarda.
 */
export function validateCopyDetails(details: NewCopyDetails): CopyDetails {
  return {
    kind: details.kind,
    acquiredOn: details.acquiredOn,
    familyOwner: details.kind === "family" ? details.familyOwner : null,
    ...kindDetailOf(details),
  };
}

export function buildNewCopy(storeId: string, details: CopyDetails): NewCopy {
  return {
    storeId,
    kind: details.kind,
    acquiredOn: details.acquiredOn,
    familyOwner: details.familyOwner,
    ...(details.kindDetail ? { kindDetail: details.kindDetail } : {}),
  };
}

/** Una fila de «Dónde y cómo lo tenés». La tienda es la elección del usuario, todavía sin resolver. */
export type CopyRow<TStore> = NewCopyDetails & Readonly<{ store: TStore | null }>;

export type ValidCopyRow<TStore> = CopyDetails & Readonly<{ store: TStore }>;

/** Una fila sin tienda frena todo el guardado: no se adivina dónde está la copia. */
export function validateCopyRows<TStore>(rows: readonly CopyRow<TStore>[]): readonly ValidCopyRow<TStore>[] {
  return rows.map((row) => {
    if (row.store === null) {
      throw new CopyStoreMissingError();
    }

    return { ...validateCopyDetails(row), store: row.store };
  });
}

/** Comprar o recibir algo de «Quiero jugarlo» lo pasa a «Pendiente»; una suscripción o una familia, no. */
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
