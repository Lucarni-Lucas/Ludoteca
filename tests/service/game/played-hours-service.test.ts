import { describe, expect, it, vi } from "vitest";

import { PlayedHoursOutOfRangeError } from "@/model/game/errors";
import { createPlayedHoursService } from "@/service/game/played-hours-service";

import { USER_ID } from "./fakes";

function buildService() {
  const gameRepo = { updatePlayedMinutes: vi.fn(async () => undefined) };
  return { service: createPlayedHoursService({ gameRepo }), gameRepo };
}

describe("setPlayedHours", () => {
  it("Cargar las horas en la ficha", async () => {
    const { service, gameRepo } = buildService();

    const saved = await service.setPlayedHours(USER_ID, "hades", 70);

    expect(saved).toBe(4200);
    expect(gameRepo.updatePlayedMinutes).toHaveBeenCalledWith(USER_ID, "hades", 4200);
  });

  it("Borrar las horas", async () => {
    const { service, gameRepo } = buildService();

    const saved = await service.setPlayedHours(USER_ID, "hades", null);

    expect(saved).toBeNull();
    expect(gameRepo.updatePlayedMinutes).toHaveBeenCalledWith(USER_ID, "hades", null);
  });

  it("Horas negativas", async () => {
    const { service, gameRepo } = buildService();

    const setting = service.setPlayedHours(USER_ID, "hades", -3);

    await expect(setting).rejects.toBeInstanceOf(PlayedHoursOutOfRangeError);
    expect(gameRepo.updatePlayedMinutes).not.toHaveBeenCalled();
  });
});
