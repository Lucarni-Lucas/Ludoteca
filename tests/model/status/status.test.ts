import { describe, expect, it } from "vitest";

import { EndlessChangeNotAcceptedError } from "@/model/status/errors";
import {
  DEFAULT_STATUSES,
  finishedOn,
  groupStatuses,
  hasDefaultName,
  planStatusChange,
  type Status,
  statusMarks,
  statusMeaningKey,
} from "@/model/status/status";

const TODAY = "2026-11-06";

function status(overrides: Partial<Status> = {}): Status {
  return {
    id: "jugando",
    group: "in_progress",
    name: "Jugando",
    color: "lime",
    position: 1,
    systemKey: "playing",
    ...overrides,
  };
}

const completed = status({ id: "completado", group: "finished", name: "Completado", systemKey: "completed" });
const hundred = status({ id: "cien", group: "finished", name: "100%", position: 2, systemKey: "hundred_percent" });

describe("planStatusChange", () => {
  it("elegir el mismo estado no genera cambio", () => {
    const game = { status: status() };

    const plan = planStatusChange(game, status(), TODAY);

    expect(plan).toBeNull();
  });

  it("entrar a Terminado fija la fecha de hoy y registra los dos estados", () => {
    const game = { status: status() };

    const plan = planStatusChange(game, completed, TODAY);

    expect(plan).toEqual({
      statusId: "completado",
      statusSince: TODAY,
      entry: { occurredOn: TODAY, fromStatusId: "jugando", toStatusId: "completado" },
    });
  });

  it("pasar de «Completado» a «100%» es un cambio y renueva la fecha", () => {
    const game = { status: completed };

    const plan = planStatusChange(game, hundred, TODAY);

    expect(plan?.statusSince).toBe(TODAY);
    expect(plan?.entry.fromStatusId).toBe("completado");
    expect(plan?.entry.toStatusId).toBe("cien");
  });
});

describe("finishedOn", () => {
  it("devuelve la fecha del estado cuando el juego está en Terminado", () => {
    const since = "2026-10-28";

    const date = finishedOn(completed, since);

    expect(date).toBe(since);
  });

  it("devuelve null cuando el juego no está en Terminado", () => {
    const since = "2026-10-28";

    const date = finishedOn(status(), since);

    expect(date).toBeNull();
  });
});

describe("groupStatuses", () => {
  it("ordena cada grupo por posición aunque lleguen desordenados", () => {
    const statuses = [hundred, completed];

    const groups = groupStatuses(statuses);

    const finished = groups.find(({ group }) => group === "finished");
    expect(finished?.statuses.map(({ name }) => name)).toEqual(["Completado", "100%"]);
  });

  it("muestra los cuatro grupos aunque alguno esté vacío", () => {
    const statuses = [completed];

    const groups = groupStatuses(statuses);

    expect(groups.map(({ group }) => group)).toEqual(["in_progress", "not_started", "finished", "dropped"]);
  });
});

describe("DEFAULT_STATUSES", () => {
  it("no repite una clave de sistema", () => {
    const keys = DEFAULT_STATUSES.map(({ systemKey }) => systemKey);

    const unique = new Set(keys);

    expect(unique.size).toBe(keys.length);
  });
});

describe("hasDefaultName", () => {
  it.each([
    { name: "reconoce un estado de fábrica con su nombre de fábrica", value: status({ name: "Quiero jugarlo", systemKey: "wishlist" }), expected: true },
    { name: "un estado renombrado se ve tal cual", value: status({ name: "Algún día", systemKey: "wishlist" }), expected: false },
    { name: "un nombre de fábrica de otro system_key no se traduce", value: status({ name: "Jugando", systemKey: "wishlist" }), expected: false },
    { name: "un estado propio sin system_key no es de fábrica", value: status({ name: "Jugando", systemKey: null }), expected: false },
  ])("$name", ({ value, expected }) => {
    const current = value;

    const result = hasDefaultName(current);

    expect(result).toBe(expected);
  });
});

describe("estados por defecto", () => {
  function namesOf(group: Status["group"]): readonly string[] {
    return DEFAULT_STATUSES.filter((value) => value.group === group).map(({ name }) => name);
  }

  it("Estado «Jugado»", () => {
    const names = namesOf("finished");

    expect(names).toEqual(["Completado", "Jugado"]);
  });

  it("Sin empezar", () => {
    const names = namesOf("not_started");

    expect(names).toEqual(["Quiero jugarlo", "Backlog"]);
  });

  it("no tiene un estado «Sin fin»: es una marca del juego", () => {
    const keys = DEFAULT_STATUSES.map(({ systemKey }) => systemKey);

    expect(keys).not.toContain("endless");
    expect(namesOf("in_progress")).toEqual(["Jugando", "En pausa"]);
  });
});

describe("statusMeaningKey", () => {
  it.each([
    { name: "un estado de fábrica tiene su línea", value: status(), expected: "playing" },
    { name: "uno renombrado conserva la línea de su función", value: status({ name: "Dándole", systemKey: "playing" }), expected: "playing" },
    { name: "uno creado por el usuario no tiene línea", value: status({ name: "Rejugando", systemKey: null }), expected: null },
  ])("$name", ({ value, expected }) => {
    const key = statusMeaningKey(value);

    expect(key).toBe(expected);
  });
});

describe("statusMarks", () => {
  const played = { systemKey: "played" };
  const completedTarget = { systemKey: "completed" };
  const FINITE = { endless: false, hundredPercent: false };
  const ENDLESS = { endless: true, hundredPercent: false };

  it("«Jugado» en un juego con final, sin el aviso aceptado, da EndlessChangeNotAcceptedError", () => {
    const mark = () => statusMarks(FINITE, played);

    expect(mark).toThrow(EndlessChangeNotAcceptedError);
  });

  it("«Jugado» en un juego con final, con el aviso aceptado, le pone la marca «Sin fin»", () => {
    const marks = statusMarks(FINITE, played, { acceptEndless: true });

    expect(marks).toEqual({ endless: true, hundredPercent: false });
  });

  it("«Completado» en un juego sin fin, con el aviso aceptado, le saca la marca «Sin fin»", () => {
    const marks = statusMarks(ENDLESS, completedTarget, { acceptEndless: true });

    expect(marks).toEqual({ endless: false, hundredPercent: false });
  });

  it("«Completado» en un juego sin fin, sin el aviso, da EndlessChangeNotAcceptedError", () => {
    const mark = () => statusMarks(ENDLESS, completedTarget);

    expect(mark).toThrow(EndlessChangeNotAcceptedError);
  });

  it("«Jugado» en un juego que ya es sin fin no pide el aviso", () => {
    const marks = statusMarks(ENDLESS, played);

    expect(marks).toEqual({ endless: true, hundredPercent: false });
  });

  it("Completar al 100%", () => {
    const marks = statusMarks(FINITE, completedTarget, { hundredPercent: true });

    expect(marks).toEqual({ endless: false, hundredPercent: true });
  });

  it("«100%» solo vale en «Completado»", () => {
    const marks = statusMarks(FINITE, { systemKey: "playing" }, { hundredPercent: true });

    expect(marks.hundredPercent).toBe(false);
  });

  it("Salir de Completado", () => {
    const marks = statusMarks({ endless: false, hundredPercent: true }, { systemKey: "playing" });

    expect(marks).toEqual({ endless: false, hundredPercent: false });
  });

  it("quedarse en «Completado» sin tocar la casilla conserva «100%»", () => {
    const marks = statusMarks({ endless: false, hundredPercent: true }, completedTarget);

    expect(marks.hundredPercent).toBe(true);
  });

  it("un estado creado por el usuario no cambia ninguna marca", () => {
    const marks = statusMarks(ENDLESS, { systemKey: null });

    expect(marks).toEqual(ENDLESS);
  });
});

describe("Color de «Lo probé»", () => {
  it("«Lo probé» es violeta y «Abandonado», coral", () => {
    const colors = DEFAULT_STATUSES.filter((value) => value.group === "dropped").map(({ name, color }) => [name, color]);

    expect(colors).toEqual([
      ["Abandonado", "coral"],
      ["Lo probé", "violet"],
    ]);
  });
});
