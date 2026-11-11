import { describe, expect, it } from "vitest";

import {
  DEFAULT_STATUSES,
  finishedOn,
  groupStatuses,
  planStatusChange,
  type Status,
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

    expect(groups.map(({ label }) => label)).toEqual(["En curso", "Sin empezar", "Terminado", "Dejado"]);
  });
});

describe("DEFAULT_STATUSES", () => {
  it("no repite una clave de sistema", () => {
    const keys = DEFAULT_STATUSES.map(({ systemKey }) => systemKey);

    const unique = new Set(keys);

    expect(unique.size).toBe(keys.length);
  });
});
