import { describe, expect, it } from "vitest";

import { correctionsToSave, initialMarks, planGameStatusChange } from "@/model/game/game-status";
import { EndlessChangeNotAcceptedError } from "@/model/status/errors";

import { buildGame, statusByKey } from "./library-fixtures";

const TODAY = "2026-11-27";

describe("planGameStatusChange", () => {
  it("Jugado en un juego con final", () => {
    const hollowKnight = buildGame({ status: statusByKey("playing") });

    const change = planGameStatusChange(hollowKnight, statusByKey("played"), TODAY, { acceptEndless: true });

    expect(change.plan?.statusId).toBe("played");
    expect(change.marks).toEqual({ endless: true, hundredPercent: false });
  });

  it("Completado en un juego sin fin, sin aceptar el aviso, no cambia nada", () => {
    const rocketLeague = buildGame({ status: statusByKey("playing"), corrections: { estimatedHours: null, endless: true, coverUrl: null } });

    const change = () => planGameStatusChange(rocketLeague, statusByKey("completed"), TODAY);

    expect(change).toThrow(EndlessChangeNotAcceptedError);
  });

  it("sacar la marca de un juego sin fin por el catálogo la guarda como corrección", () => {
    const fortnite = buildGame({ status: statusByKey("playing"), catalog: { estimatedHours: null, endless: true, coverUrl: null } });

    const change = planGameStatusChange(fortnite, statusByKey("completed"), TODAY, { acceptEndless: true });

    expect(change.marks).toEqual({ endless: false, hundredPercent: false });
  });

  it("Completar al 100%", () => {
    const hollowKnight = buildGame({ status: statusByKey("playing") });

    const change = planGameStatusChange(hollowKnight, statusByKey("completed"), TODAY, { hundredPercent: true });

    expect(change.marks).toEqual({ endless: null, hundredPercent: true });
  });

  it("marcar «100%» sin cambiar de estado no va al diario", () => {
    const hollowKnight = buildGame({ status: statusByKey("completed") });

    const change = planGameStatusChange(hollowKnight, statusByKey("completed"), TODAY, { hundredPercent: true });

    expect(change).toEqual({ plan: null, marks: { endless: null, hundredPercent: true } });
  });

  it("Salir de Completado", () => {
    const hollowKnight = buildGame({ status: statusByKey("completed"), hundredPercent: true });

    const change = planGameStatusChange(hollowKnight, statusByKey("playing"), TODAY);

    expect(change.marks).toEqual({ endless: null, hundredPercent: false });
  });

  it("un cambio de estado sin marcas no toca las marcas", () => {
    const hades = buildGame({ status: statusByKey("playing") });

    const change = planGameStatusChange(hades, statusByKey("abandoned"), TODAY);

    expect(change.marks).toBeNull();
  });
});

describe("initialMarks", () => {
  it("Al agregar", () => {
    const marks = initialMarks(statusByKey("played"), { acceptEndless: true });

    expect(marks).toEqual({ endless: true, hundredPercent: false });
  });

  it("un juego nuevo en «Backlog» no lleva marcas", () => {
    const marks = initialMarks(statusByKey("backlog"));

    expect(marks).toBeNull();
  });

  it("«Jugado» al agregar sin el aviso da EndlessChangeNotAcceptedError", () => {
    const marks = () => initialMarks(statusByKey("played"));

    expect(marks).toThrow(EndlessChangeNotAcceptedError);
  });
});

describe("correctionsToSave", () => {
  const corrections = { estimatedHours: null, endless: null, coverUrl: null, hundredPercent: true };

  it("guarda «100%» desde «Editar» en un juego en «Completado»", () => {
    const saved = correctionsToSave(buildGame({ status: statusByKey("completed") }), corrections);

    expect(saved.hundredPercent).toBe(true);
  });

  it("ignora «100%» desde «Editar» fuera de «Completado»", () => {
    const saved = correctionsToSave(buildGame({ status: statusByKey("playing") }), corrections);

    expect(saved).not.toHaveProperty("hundredPercent");
  });
});
