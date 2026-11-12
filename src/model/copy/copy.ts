export const COPY_KINDS = ["purchased", "free", "subscription", "family", "physical", "other"] as const;
export const LOST_REASONS = ["left_family", "subscription_ended", "sold", "other"] as const;

export type CopyKind = (typeof COPY_KINDS)[number];
export type LostReason = (typeof LOST_REASONS)[number];

export const COPY_KIND_LABELS: Readonly<Record<CopyKind, string>> = {
  purchased: "Comprado",
  free: "Gratis",
  subscription: "Suscripción",
  family: "Familia",
  physical: "Físico",
  other: "Otro",
};

export const LOST_REASON_LABELS: Readonly<Record<LostReason, string>> = {
  left_family: "Salí de la familia",
  subscription_ended: "Terminó la suscripción",
  sold: "Lo vendí",
  other: "Otro",
};

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

/** En la tarjeta, el detalle de una copia Otro dice más que la palabra «Otro». */
export function copyCardLabel(copy: Pick<Copy, "kind" | "storeName" | "kindDetail">): string {
  if (copy.kind === "purchased") {
    return copy.storeName;
  }

  return `${copy.storeName} · ${otherDetail(copy) ?? COPY_KIND_LABELS[copy.kind]}`;
}

function kindSuffix(copy: Pick<Copy, "kind" | "familyOwner" | "kindDetail">): string | null {
  if (copy.kind === "family" && copy.familyOwner) {
    return `de ${copy.familyOwner}`;
  }

  return otherDetail(copy);
}

export function copyDetailLabel(copy: Pick<Copy, "kind" | "familyOwner" | "kindDetail" | "lostAt">): string {
  const kindLabel = COPY_KIND_LABELS[copy.kind];

  if (isLost(copy)) {
    return `${kindLabel} · ya no`;
  }

  const suffix = kindSuffix(copy);
  return suffix ? `${kindLabel} · ${suffix}` : kindLabel;
}

export type LostMark = Readonly<{ lostAt: string; lostReason: LostReason }>;

export const NO_LOST_MARK = { lostAt: null, lostReason: null } as const;

/** La marca solo agrega fecha y motivo: el tipo, el detalle y la fecha original quedan como estaban. */
export function markCopyLost(lostAt: string, lostReason: LostReason): LostMark {
  return { lostAt, lostReason };
}
