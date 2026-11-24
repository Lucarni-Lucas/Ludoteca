import { describe, expect, it } from "vitest";

import { detectNonGame, findNonGameBase, isNonGame } from "@/model/import/non-game";

const EPIC = "epic";
const STEAM = "steam";

function row(title: string, storeId: string | null = EPIC) {
  return { title, storeId };
}

describe("detectNonGame", () => {
  it.each([
    ["Barony (Beta)", "barony"],
    ["Chivalry 2 - Public Testing", "chivalry2"],
    ["KillingFloor2Beta", "killingfloor2"],
    ["Mortal Shell Tech Beta", "mortalshell"],
    ["Nightingale - Legacy Mode", "nightingale"],
    ["Q.U.B.E. 2 Soundtrack", "qube2"],
    ["Ubisoft Connect Services", "ubisoftconnect"],
    ["Rust Dedicated Server", "rust"],
    ["Hades OST", "hades"],
    ["Hades Demo", "hades"],
  ])("«%s» no es un juego y su base es «%s»", (title, baseKey) => {
    const written = title;

    const detected = detectNonGame(written);

    expect(detected).toEqual({ kind: "suffix", baseKey });
  });

  it("un nombre tapado por la tienda no es un juego", () => {
    const title = "[REDACTED]";

    const detected = detectNonGame(title);

    expect(detected).toEqual({ kind: "hidden" });
  });

  it.each(["Demolition Derby", "The Demo Disc Collection", "Beta Decay", "Demo"])(
    "«%s» es un juego: el sufijo solo cuenta al final y con algo antes",
    (title) => {
      const written = title;

      const nonGame = isNonGame(written);

      expect(nonGame).toBe(false);
    },
  );
});

describe("findNonGameBase", () => {
  it("«KillingFloor2Beta» encuentra «Killing Floor 2»", () => {
    const candidates = [row("Killing Floor 2"), row("Killing Floor")];

    const base = findNonGameBase(row("KillingFloor2Beta"), candidates);

    expect(base).toBe(candidates[0]);
  });

  it("«Q.U.B.E. 2 Soundtrack» cuelga de «Q.U.B.E. 2» de la misma tienda", () => {
    const candidates = [row("Q.U.B.E. 2", STEAM), row("Q.U.B.E. 2", EPIC)];

    const base = findNonGameBase(row("Q.U.B.E. 2 Soundtrack", EPIC), candidates);

    expect(base).toBe(candidates[1]);
  });

  it("«Q.U.B.E. 2 Soundtrack» no cuelga de «Q.U.B.E. 2» de otra tienda", () => {
    const candidates = [row("Q.U.B.E. 2", STEAM)];

    const base = findNonGameBase(row("Q.U.B.E. 2 Soundtrack", EPIC), candidates);

    expect(base).toBeUndefined();
  });

  it("«Ubisoft Connect Services» no cuelga de nada", () => {
    const candidates = [row("Assassin's Creed", STEAM), row("Far Cry 5", STEAM)];

    const base = findNonGameBase(row("Ubisoft Connect Services", STEAM), candidates);

    expect(base).toBeUndefined();
  });

  it("«[REDACTED]» no cuelga de nada", () => {
    const candidates = [row("REDACTED"), row("Redacted")];

    const base = findNonGameBase(row("[REDACTED]"), candidates);

    expect(base).toBeUndefined();
  });

  it("no cuelga de otra entrada que tampoco es juego", () => {
    const candidates = [row("Barony Demo")];

    const base = findNonGameBase(row("Barony Beta"), candidates);

    expect(base).toBeUndefined();
  });
});
