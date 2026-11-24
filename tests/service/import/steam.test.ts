import { describe, expect, it } from "vitest";

import { SteamGamesPrivateError, SteamNotConfiguredError } from "@/adapter/steam/errors";
import type { ImportRow } from "@/model/import/import-row";
import { InvalidSteamProfileError } from "@/model/store/errors";
import { InvalidRequestError } from "@/shared/app-error";

import { STEAM } from "../../model/import/import-fixtures";
import { createFakeConnections, createFakeSteam, setup, USER_ID } from "./fakes";

const STEAM_ID = "76561197960287930";

function steamRow(appId: string, title: string, minutes: number): ImportRow {
  return {
    source: "steam",
    sourceKey: appId,
    title,
    altTitles: [],
    year: null,
    storeName: "Steam",
    storeGameId: appId,
    playtimeMinutes: minutes,
    ignStatuses: [],
    ignScore: null,
    hltbMainHours: null,
    steamAppId: appId,
  };
}

const ROWS = [steamRow("367520", "Hollow Knight", 2880), steamRow("250420", "8BitMMO", 0)];

describe("connectSteam", () => {
  it("Perfil público", async () => {
    const { service, importRepo, connections, steam } = setup({ steam: createFakeSteam(ROWS) });

    const connected = await service.connectSteam(USER_ID, `https://steamcommunity.com/profiles/${STEAM_ID}/`);

    expect(connected).toEqual({ accountId: STEAM_ID, read: 2 });
    expect(steam.getOwnedGames).toHaveBeenCalledWith(STEAM_ID);
    expect(connections.saved).toEqual([{ storeId: STEAM.id, accountId: STEAM_ID, lastSyncedAt: null }]);
    expect(importRepo.state.saved.map((item) => [item.title, item.storeId, item.playtimeMinutes])).toEqual([
      ["Hollow Knight", STEAM.id, 2880],
      ["8BitMMO", STEAM.id, 0],
    ]);
  });

  it("resuelve un link con nombre antes de traer los juegos", async () => {
    const { service, steam } = setup({ steam: createFakeSteam(ROWS) });

    await service.connectSteam(USER_ID, "steamcommunity.com/id/gaben");

    expect(steam.resolveVanity).toHaveBeenCalledWith("gaben");
    expect(steam.getOwnedGames).toHaveBeenCalledWith(STEAM_ID);
  });

  it("Perfil privado", async () => {
    const steam = createFakeSteam();
    steam.getOwnedGames.mockRejectedValue(new SteamGamesPrivateError());
    const { service, importRepo, connections } = setup({ steam });

    const connect = service.connectSteam(USER_ID, STEAM_ID);

    await expect(connect).rejects.toBeInstanceOf(SteamGamesPrivateError);
    expect(importRepo.upsertItems).not.toHaveBeenCalled();
    expect(connections.saved).toEqual([]);
  });

  it("un link que no es de Steam no llama a Steam", async () => {
    const { service, steam } = setup();

    const connect = service.connectSteam(USER_ID, "https://store.steampowered.com/app/620/");

    await expect(connect).rejects.toBeInstanceOf(InvalidSteamProfileError);
    expect(steam.getOwnedGames).not.toHaveBeenCalled();
  });

  it("la clave sin configurar da SteamNotConfiguredError", async () => {
    const steam = createFakeSteam([], false);
    steam.getOwnedGames.mockRejectedValue(new SteamNotConfiguredError());
    const { service, connections } = setup({ steam });

    const connect = service.connectSteam(USER_ID, STEAM_ID);

    await expect(connect).rejects.toBeInstanceOf(SteamNotConfiguredError);
    expect(connections.saved).toEqual([]);
  });
});

describe("refreshSteam", () => {
  it("«Traer de nuevo» vuelve a pedir la lista de la cuenta conectada y guarda las mismas filas", async () => {
    const connections = createFakeConnections({ storeId: STEAM.id, accountId: STEAM_ID, lastSyncedAt: null });
    const { service, importRepo, steam } = setup({ steam: createFakeSteam(ROWS), connections });

    await service.refreshSteam(USER_ID);
    await service.refreshSteam(USER_ID);

    expect(steam.getOwnedGames).toHaveBeenCalledTimes(2);
    expect(importRepo.upsertItems.mock.calls[0][1]).toEqual(importRepo.upsertItems.mock.calls[1][1]);
    expect(connections.saved).toHaveLength(1);
  });

  it("sin cuenta conectada no hay nada que traer", async () => {
    const { service, steam } = setup();

    const refresh = service.refreshSteam(USER_ID);

    await expect(refresh).rejects.toBeInstanceOf(InvalidRequestError);
    expect(steam.getOwnedGames).not.toHaveBeenCalled();
  });
});
