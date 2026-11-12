import { describe, expect, it } from "vitest";

import { KindDetailTooLongError } from "@/model/copy/errors";
import { buildNewCopy, planStatusAfterNewCopy, validateCopyDetails } from "@/model/copy/new-copy";

import { STATUSES, statusByKey } from "../game/library-fixtures";

const TODAY = "2026-11-11";
const OTHER = { kind: "other" as const, acquiredOn: null, familyOwner: null };

describe("validateCopyDetails", () => {
  it("guarda el detalle de una copia Otro", () => {
    const details = { ...OTHER, kindDetail: "Regalo" };

    const valid = validateCopyDetails(details);

    expect(valid.kindDetail).toBe("Regalo");
  });

  it("Otro sin detalle", () => {
    const details = { ...OTHER, kindDetail: null };

    const valid = validateCopyDetails(details);

    expect(valid).toEqual({ kind: "other", acquiredOn: null, familyOwner: null });
  });

  it("Detalle demasiado largo", () => {
    const details = { ...OTHER, kindDetail: "a".repeat(41) };

    const validate = () => validateCopyDetails(details);

    expect(validate).toThrow(KindDetailTooLongError);
    expect(validate).toThrow("El detalle puede tener hasta 40 caracteres");
  });

  it("acepta un detalle de exactamente 40 caracteres", () => {
    const details = { ...OTHER, kindDetail: "a".repeat(40) };

    const valid = validateCopyDetails(details);

    expect(valid.kindDetail).toHaveLength(40);
  });

  it("cuenta un emoji como un solo carácter", () => {
    const details = { ...OTHER, kindDetail: "🎁".repeat(40) };

    const valid = validateCopyDetails(details);

    expect(valid.kindDetail).toBe("🎁".repeat(40));
  });

  it("descarta el detalle si la copia no es Otro, aunque sea largo", () => {
    const details = { kind: "purchased" as const, acquiredOn: null, familyOwner: null, kindDetail: "a".repeat(41) };

    const valid = validateCopyDetails(details);

    expect(valid).toEqual({ kind: "purchased", acquiredOn: null, familyOwner: null });
  });

  it("descarta «de quién es» en una copia Otro", () => {
    const details = { ...OTHER, familyOwner: "Martín", kindDetail: "Regalo" };

    const valid = validateCopyDetails(details);

    expect(valid.familyOwner).toBeNull();
  });
});

describe("buildNewCopy", () => {
  it("suma la tienda a los datos validados", () => {
    const details = validateCopyDetails({ ...OTHER, kindDetail: "Regalo" });

    const value = buildNewCopy("steam", details);

    expect(value).toEqual({ storeId: "steam", kind: "other", acquiredOn: null, familyOwner: null, kindDetail: "Regalo" });
  });
});

describe("planStatusAfterNewCopy", () => {
  it("Regalo de un juego deseado", () => {
    const game = { status: statusByKey("wishlist") };

    const plan = planStatusAfterNewCopy(game, "other", STATUSES, TODAY);

    expect(plan).toEqual({
      statusId: "backlog",
      statusSince: TODAY,
      entry: { occurredOn: TODAY, fromStatusId: "wishlist", toStatusId: "backlog" },
    });
  });

  it("una copia Familia no saca al juego de «Quiero jugarlo»", () => {
    const game = { status: statusByKey("wishlist") };

    const plan = planStatusAfterNewCopy(game, "family", STATUSES, TODAY);

    expect(plan).toBeNull();
  });
});
