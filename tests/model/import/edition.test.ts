import { describe, expect, it } from "vitest";

import { withoutEdition } from "@/model/import/edition";

describe("withoutEdition", () => {
  it.each([
    ["Styx: Shards of Darkness - Deluxe Edition", "Styx: Shards of Darkness"],
    ["Snakebird Complete", "Snakebird"],
    ["The Witcher 3: Wild Hunt – Game of the Year Edition", "The Witcher 3: Wild Hunt"],
    ["Control (Ultimate Edition)", "Control"],
    ["Hitman: Digital Deluxe Edition", "Hitman"],
    ["Borderlands GOTY", "Borderlands"],
    ["Divinity: Original Sin 2 - definitive edition", "Divinity: Original Sin 2"],
  ])("«%s» sin la edición es «%s»", (title, expected) => {
    const written = title;

    const stripped = withoutEdition(written);

    expect(stripped).toBe(expected);
  });

  it.each(["Complete", "Deluxe Edition", "- GOTY -"])("«%s» no deja nada antes: no se saca", (title) => {
    const written = title;

    const stripped = withoutEdition(written);

    expect(stripped).toBeNull();
  });

  it.each(["Deluxe Edition Racing", "Complete Chess", "Hollow Knight", "[REDACTED]"])(
    "«%s» no nombra una edición al final",
    (title) => {
      const written = title;

      const stripped = withoutEdition(written);

      expect(stripped).toBeNull();
    },
  );

  it("una palabra que termina igual no es la edición: «Incomplete» no es «Complete»", () => {
    const title = "Gods Will Be Watching Incomplete";

    const stripped = withoutEdition(title);

    expect(stripped).toBeNull();
  });
});
