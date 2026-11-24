import { describe, expect, it } from "vitest";

import { chunk } from "@/shared/chunk";

describe("chunk", () => {
  it("parte la lista en tandas del tamaño pedido, con la última más chica", () => {
    const values = [1, 2, 3, 4, 5];

    const parts = chunk(values, 2);

    expect(parts).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("una lista vacía no da tandas", () => {
    const values: number[] = [];

    const parts = chunk(values, 10);

    expect(parts).toEqual([]);
  });
});
