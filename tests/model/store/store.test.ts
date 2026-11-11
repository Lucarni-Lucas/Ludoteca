import { describe, expect, it } from "vitest";

import { findStoreByName, type Store, storeSlug } from "@/model/store/store";

const steam: Store = { id: "1", name: "Steam", slug: "steam" };
const itch: Store = { id: "2", name: "itch.io", slug: "itch-io" };

describe("storeSlug", () => {
  it.each([
    { name: "Humble Store", expected: "humble-store" },
    { name: "  itch.io ", expected: "itch-io" },
    { name: "Tienda Ñandú", expected: "tienda-nandu" },
    { name: "¿?", expected: "" },
  ])("convierte «$name» en «$expected»", ({ name, expected }) => {
    const value = name;

    const slug = storeSlug(value);

    expect(slug).toBe(expected);
  });
});

describe("findStoreByName", () => {
  it.each(["steam", "STEAM", " Steam "])("reconoce «%s» escrito a mano como Steam", (name) => {
    const stores = [steam, itch];

    const found = findStoreByName(stores, name);

    expect(found).toBe(steam);
  });

  it("no confunde una tienda que no existe", () => {
    const stores = [steam, itch];

    const found = findStoreByName(stores, "Humble Store");

    expect(found).toBeUndefined();
  });
});
