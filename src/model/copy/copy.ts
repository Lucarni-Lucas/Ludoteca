export const COPY_KINDS = ["purchased", "free", "subscription", "family", "physical"] as const;
export const LOST_REASONS = ["left_family", "subscription_ended", "sold", "other"] as const;

export type CopyKind = (typeof COPY_KINDS)[number];
export type LostReason = (typeof LOST_REASONS)[number];

export const COPY_KIND_LABELS: Readonly<Record<CopyKind, string>> = {
  purchased: "Comprado",
  free: "Gratis",
  subscription: "Suscripción",
  family: "Familia",
  physical: "Físico",
};

export const LOST_REASON_LABELS: Readonly<Record<LostReason, string>> = {
  left_family: "Salí de la familia",
  subscription_ended: "Terminó la suscripción",
  sold: "Lo vendí",
  other: "Otro",
};

const OWN_COPY_KINDS: readonly CopyKind[] = ["purchased", "free", "physical"];

export type Copy = Readonly<{
  id: string;
  storeId: string;
  storeName: string;
  kind: CopyKind;
  acquiredOn: string | null;
  playtimeMinutes: number | null;
  familyOwner: string | null;
  lostAt: string | null;
  lostReason: LostReason | null;
}>;

/** Comprado, Gratis y Físico son copias propias: una Suscripción o una Familia se pueden perder sin comprar nada. */
export function isOwnCopyKind(kind: CopyKind): boolean {
  return OWN_COPY_KINDS.includes(kind);
}

export function isLost(copy: Pick<Copy, "lostAt">): boolean {
  return copy.lostAt !== null;
}

export function copyCardLabel(copy: Pick<Copy, "kind" | "storeName">): string {
  return copy.kind === "purchased" ? copy.storeName : `${copy.storeName} · ${COPY_KIND_LABELS[copy.kind]}`;
}

export function copyDetailLabel(copy: Pick<Copy, "kind" | "familyOwner" | "lostAt">): string {
  const kindLabel = COPY_KIND_LABELS[copy.kind];

  if (isLost(copy)) {
    return `${kindLabel} · ya no`;
  }

  return copy.kind === "family" && copy.familyOwner ? `${kindLabel} · de ${copy.familyOwner}` : kindLabel;
}

export type LostMark = Readonly<{ lostAt: string; lostReason: LostReason }>;

export const NO_LOST_MARK = { lostAt: null, lostReason: null } as const;

/** La marca solo agrega fecha y motivo: el tipo y la fecha original quedan como estaban. */
export function markCopyLost(lostAt: string, lostReason: LostReason): LostMark {
  return { lostAt, lostReason };
}
