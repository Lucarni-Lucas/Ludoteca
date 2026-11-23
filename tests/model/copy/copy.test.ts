import { describe, expect, it } from "vitest";

import {
  type Copy,
  copyCardParts,
  copyDetailParts,
  isLost,
  isOwnCopyKind,
  markCopyLost,
  NO_LOST_MARK,
} from "@/model/copy/copy";

function copy(overrides: Partial<Copy> = {}): Copy {
  return {
    id: "copia",
    storeId: "tienda",
    storeName: "Steam",
    kind: "purchased",
    acquiredOn: null,
    playtimeMinutes: null,
    familyOwner: null,
    lostAt: null,
    lostReason: null,
    ...overrides,
  };
}

describe("copyCardParts", () => {
  it("Copia de suscripción", () => {
    const subscription = copy({ storeName: "Game Pass", kind: "subscription" });

    const parts = copyCardParts(subscription);

    expect(parts).toEqual({ store: "Game Pass", kind: "subscription", detail: null });
  });

  it("Comprado muestra solo la tienda", () => {
    const purchased = copy();

    const parts = copyCardParts(purchased);

    expect(parts).toEqual({ store: "Steam", kind: null, detail: null });
  });

  it("una copia perdida conserva la misma etiqueta", () => {
    const lost = copy({ storeName: "Game Pass", kind: "subscription", lostAt: "2026-01-01" });

    const parts = copyCardParts(lost);

    expect(parts).toEqual({ store: "Game Pass", kind: "subscription", detail: null });
  });
});

describe("copyDetailParts", () => {
  it("Copia de la familia", () => {
    const family = copy({ kind: "family", familyOwner: "Martín" });

    const parts = copyDetailParts(family);

    expect(parts).toEqual({ kind: "family", extra: { type: "familyOwner", owner: "Martín" } });
  });

  it("muestra solo «Familia» si no se sabe de quién es", () => {
    const family = copy({ kind: "family" });

    const parts = copyDetailParts(family);

    expect(parts).toEqual({ kind: "family", extra: null });
  });

  it("una copia perdida se ve como «Físico · ya no»", () => {
    const lost = copy({ kind: "physical", lostAt: "2026-01-01", lostReason: "sold" });

    const parts = copyDetailParts(lost);

    expect(parts).toEqual({ kind: "physical", extra: { type: "lost" } });
  });
});

describe("isOwnCopyKind", () => {
  it.each([
    { kind: "purchased", expected: true },
    { kind: "free", expected: true },
    { kind: "physical", expected: true },
    { kind: "subscription", expected: false },
    { kind: "family", expected: false },
  ] as const)("$kind cuenta como propia: $expected", ({ kind, expected }) => {
    const value = kind;

    const own = isOwnCopyKind(value);

    expect(own).toBe(expected);
  });
});

describe("marcar y recuperar", () => {
  it("una copia perdida conserva su tipo y su fecha original", () => {
    const original = copy({ kind: "physical", acquiredOn: "2023-03-01" });

    const lost = { ...original, ...markCopyLost("2026-11-06", "sold") };

    expect(isLost(lost)).toBe(true);
    expect(lost.kind).toBe("physical");
    expect(lost.acquiredOn).toBe("2023-03-01");
    expect(lost.lostReason).toBe("sold");
  });

  it("recuperar una copia borra solo la marca", () => {
    const lost = copy({ kind: "subscription", storeName: "Game Pass", lostAt: "2026-01-01", lostReason: "other" });

    const recovered = { ...lost, ...NO_LOST_MARK };

    expect(isLost(recovered)).toBe(false);
    expect(copyCardParts(recovered)).toEqual({ store: "Game Pass", kind: "subscription", detail: null });
  });
});

describe("copias de tipo Otro", () => {
  it("Copia de otro tipo", () => {
    const gift = copy({ kind: "other", kindDetail: "Regalo" });

    const parts = copyDetailParts(gift);

    expect(parts).toEqual({ kind: "other", extra: { type: "detail", detail: "Regalo" } });
  });

  it("Otro sin detalle", () => {
    const other = copy({ kind: "other" });

    const parts = copyDetailParts(other);

    expect(parts).toEqual({ kind: "other", extra: null });
  });

  it("en la tarjeta muestra la tienda y el detalle", () => {
    const gift = copy({ kind: "other", kindDetail: "Regalo" });

    const parts = copyCardParts(gift);

    expect(parts).toEqual({ store: "Steam", kind: "other", detail: "Regalo" });
  });

  it("en la tarjeta muestra «Otro» si no tiene detalle", () => {
    const other = copy({ kind: "other" });

    const parts = copyCardParts(other);

    expect(parts).toEqual({ store: "Steam", kind: "other", detail: null });
  });

  it("una copia Otro perdida conserva su tipo y su detalle", () => {
    const gift = copy({ kind: "other", kindDetail: "Regalo" });

    const lost = { ...gift, ...markCopyLost("2026-11-06", "other") };

    expect(copyDetailParts(lost)).toEqual({ kind: "other", extra: { type: "lost" } });
    expect(lost.kind).toBe("other");
    expect(lost.kindDetail).toBe("Regalo");
  });

  it("una copia Otro cuenta como propia", () => {
    const kind = "other";

    const own = isOwnCopyKind(kind);

    expect(own).toBe(true);
  });
});
