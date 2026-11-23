export const COPY_KINDS = ["purchased", "free", "subscription", "family", "physical", "other"] as const;
export const LOST_REASONS = ["left_family", "subscription_ended", "sold", "other"] as const;

export type CopyKind = (typeof COPY_KINDS)[number];
export type LostReason = (typeof LOST_REASONS)[number];

const OWN_COPY_KINDS: readonly CopyKind[] = ["purchased", "free", "physical", "other"];

/** El tope es del modelo y no de la columna, igual que el resto de los textos. */
export const MAX_KIND_DETAIL_LENGTH = 40;

export type Copy = Readonly<{
  id: string;
  storeId: string;
  storeName: string;
  kind: CopyKind;
  acquiredOn: string | null;
  playtimeMinutes: number | null;
  familyOwner: string | null;
  /** Solo lo tiene una copia Otro a la que se le escribió qué es («Regalo»). */
  kindDetail?: string;
  lostAt: string | null;
  lostReason: LostReason | null;
}>;

/** Comprado, Gratis, Físico y Otro son copias propias: una Suscripción o una Familia se pueden perder sin comprar nada. */
export function isOwnCopyKind(kind: CopyKind): boolean {
  return OWN_COPY_KINDS.includes(kind);
}

export function isLost(copy: Pick<Copy, "lostAt">): boolean {
  return copy.lostAt !== null;
}

function otherDetail(copy: Pick<Copy, "kind" | "kindDetail">): string | null {
  return copy.kind === "other" && copy.kindDetail ? copy.kindDetail : null;
}

/** Lo que muestra la tarjeta: la tienda y, salvo en Comprado, el tipo o el detalle de una copia Otro. */
export type CopyCardParts = Readonly<{
  store: string;
  kind: CopyKind | null;
  /** En la tarjeta, el detalle de una copia Otro dice más que la palabra «Otro». */
  detail: string | null;
}>;

export function copyCardParts(copy: Pick<Copy, "kind" | "storeName" | "kindDetail">): CopyCardParts {
  if (copy.kind === "purchased") {
    return { store: copy.storeName, kind: null, detail: null };
  }

  return { store: copy.storeName, kind: copy.kind, detail: otherDetail(copy) };
}

/** Lo que se agrega al tipo en la ficha: de quién es la copia Familia, el detalle de Otro o que ya no la tenés. */
export type CopyDetailExtra =
  | Readonly<{ type: "familyOwner"; owner: string }>
  | Readonly<{ type: "detail"; detail: string }>
  | Readonly<{ type: "lost" }>;

export type CopyDetailParts = Readonly<{ kind: CopyKind; extra: CopyDetailExtra | null }>;

function detailExtra(copy: Pick<Copy, "kind" | "familyOwner" | "kindDetail" | "lostAt">): CopyDetailExtra | null {
  if (isLost(copy)) {
    return { type: "lost" };
  }

  if (copy.kind === "family" && copy.familyOwner) {
    return { type: "familyOwner", owner: copy.familyOwner };
  }

  const detail = otherDetail(copy);
  return detail ? { type: "detail", detail } : null;
}

export function copyDetailParts(copy: Pick<Copy, "kind" | "familyOwner" | "kindDetail" | "lostAt">): CopyDetailParts {
  return { kind: copy.kind, extra: detailExtra(copy) };
}

export type LostMark = Readonly<{ lostAt: string; lostReason: LostReason }>;

export const NO_LOST_MARK = { lostAt: null, lostReason: null } as const;

/** La marca solo agrega fecha y motivo: el tipo, el detalle y la fecha original quedan como estaban. */
export function markCopyLost(lostAt: string, lostReason: LostReason): LostMark {
  return { lostAt, lostReason };
}
