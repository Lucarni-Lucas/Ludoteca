import { describe, expect, it } from "vitest";

import { decideSchema, searchAgainSchema, steamProfileSchema } from "@/app/(app)/import/import-schemas";

const ENTRY_ID = "00000000-0000-4000-8000-00000000000a";

describe("decideSchema", () => {
  it.each([
    { kind: "accept" },
    { kind: "reset" },
    { kind: "choose", choice: { kind: "not_interested" } },
    { kind: "choose", choice: { kind: "status", statusKey: "completed" } },
    { kind: "choose", choice: { kind: "copy_kind", copyKind: "family" } },
    { kind: "copy_kind", storeId: ENTRY_ID, copyKind: "purchased" },
  ])("acepta la decisión %j", (decision) => {
    const input = { entryIds: [ENTRY_ID], decision };

    const parsed = decideSchema.safeParse(input);

    expect(parsed.success).toBe(true);
  });

  it.each([
    { entryIds: [], decision: { kind: "accept" } },
    { entryIds: ["no-es-uuid"], decision: { kind: "accept" } },
    { entryIds: [ENTRY_ID], decision: { kind: "borrar_todo" } },
    { entryIds: [ENTRY_ID], decision: { kind: "choose", choice: { kind: "copy_kind", copyKind: "robado" } } },
  ])("rechaza %j", (input) => {
    const value = input;

    const parsed = decideSchema.safeParse(value);

    expect(parsed.success).toBe(false);
  });
});

describe("steamProfileSchema", () => {
  it("recorta los espacios del perfil pegado", () => {
    const pasted = "  https://steamcommunity.com/id/gaben  ";

    const parsed = steamProfileSchema.parse(pasted);

    expect(parsed).toBe("https://steamcommunity.com/id/gaben");
  });

  it("rechaza un texto vacío o de más de 200 caracteres", () => {
    const values = ["   ", "x".repeat(201)];

    const results = values.map((value) => steamProfileSchema.safeParse(value).success);

    expect(results).toEqual([false, false]);
  });
});

describe("searchAgainSchema", () => {
  it("acepta un resultado de la búsqueda de IGDB", () => {
    const input = { entryId: ENTRY_ID, chosen: { igdbId: 3, baseIgdbId: 3, title: "Crash Bandicoot", year: 1996, coverUrl: null } };

    const parsed = searchAgainSchema.safeParse(input);

    expect(parsed.success).toBe(true);
  });
});
