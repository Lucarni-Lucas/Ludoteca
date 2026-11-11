import { describe, expect, it, vi } from "vitest";

import type { DefaultStatus, Status } from "@/model/status/status";
import { createStatusService } from "@/service/status/status-service";

function createFakeRepository(initial: readonly DefaultStatus[] = []) {
  const stored: Status[] = initial.map((value, index) => ({ ...value, id: `estado-${index}` }));

  return {
    listByUser: vi.fn(async () => [...stored]),
    insertDefaults: vi.fn(async (_userId: string, defaults: readonly DefaultStatus[]) => {
      stored.push(...defaults.map((value, index) => ({ ...value, id: `estado-${index}` })));
    }),
  };
}

const USER_ID = "usuario-nuevo";

describe("createStatusService", () => {
  it("Grupos de un usuario nuevo", async () => {
    const service = createStatusService({ statusRepo: createFakeRepository() });

    const groups = await service.listGrouped(USER_ID);

    expect(groups.map(({ label }) => label)).toEqual(["En curso", "Sin empezar", "Terminado", "Dejado"]);
  });

  it("Estado «Jugado»", async () => {
    const service = createStatusService({ statusRepo: createFakeRepository() });

    const groups = await service.listGrouped(USER_ID);

    const finished = groups.find(({ group }) => group === "finished");
    expect(finished?.statuses.map(({ name }) => name)).toEqual(["Completado", "100%", "Jugado"]);
  });

  it("no vuelve a crear los estados si el usuario ya tiene", async () => {
    const statusRepo = createFakeRepository([
      { group: "in_progress", name: "Jugando", color: "lime", position: 1, systemKey: "playing" },
    ]);
    const service = createStatusService({ statusRepo });

    await service.listStatuses(USER_ID);

    expect(statusRepo.insertDefaults).not.toHaveBeenCalled();
  });
});
