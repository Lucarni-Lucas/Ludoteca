import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATUSES,
  finishedOn,
  groupStatuses,
  hasDefaultName,
  offeredStatuses,
  planStatusChange,
  type Status,
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

    expect(names).toEqual(["Completado", "100%", "Jugado"]);
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

describe("offeredStatuses", () => {
  const ALL: readonly Status[] = DEFAULT_STATUSES.map((value) => ({ ...value, id: value.systemKey ?? value.name }));
  const replaying = status({ id: "rejugando", name: "Rejugando", position: 3, systemKey: null });

  function offeredKeys(statuses: readonly Status[], endless: boolean, currentId: string | null = null): readonly string[] {
    return offeredStatuses(statuses, { endless, currentId }).map(({ id }) => id);
  }

  it("Juego sin fin", () => {
    const offered = offeredKeys(ALL, true);

    expect(offered).toContain("played");
    expect(offered).not.toContain("completed");
    expect(offered).not.toContain("hundred_percent");
  });

  it("Juego con final", () => {
    const offered = offeredKeys(ALL, false);

    expect(offered).toContain("completed");
    expect(offered).toContain("hundred_percent");
    expect(offered).not.toContain("played");
  });

  it("ofrece siempre los estados creados por el usuario", () => {
    const statuses = [...ALL, replaying];

    const offered = [offeredKeys(statuses, true), offeredKeys(statuses, false)];

    expect(offered.every((keys) => keys.includes("rejugando"))).toBe(true);
  });

  it("conserva el estado actual aunque no se le ofrecería", () => {
    const offered = offeredKeys(ALL, true, "completed");

    expect(offered).toContain("completed");
    expect(offered).not.toContain("hundred_percent");
  });

  it("ofrece los demás estados en los dos casos", () => {
    const shared = ["playing", "paused", "wishlist", "backlog", "abandoned", "tried"];

    const offered = [offeredKeys(ALL, true), offeredKeys(ALL, false)];

    expect(offered.every((keys) => shared.every((key) => keys.includes(key)))).toBe(true);
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
