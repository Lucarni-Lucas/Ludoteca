import { describe, expect, it } from "vitest";

import { GameNotFoundError } from "@/model/game/errors";
import { StatusNotFoundError } from "@/model/status/errors";
import { StoreNotFoundError } from "@/model/store/errors";
import { createCatalogService, type ManualGameInput } from "@/service/game/catalog-service";

import {
  clock,
  createFakeGameRepo,
  createFakeIgdb,
  createFakeStoreRepo,
  fakeStoreResolver,
  igdbData,
  searchResult,
  statusService,
  TODAY,
  USER_ID,
} from "./fakes";

type Dependencies = Parameters<typeof createCatalogService>[0];

function buildService(overrides: Partial<Dependencies> = {}) {
  return createCatalogService({
    igdb: createFakeIgdb(),
    gameRepo: createFakeGameRepo(),
    statusService,
    storeResolver: fakeStoreResolver(),
    clock,
    ...overrides,
  });
}

const MANUAL: ManualGameInput = {
  title: "Cartas del Faro",
  year: null,
  estimatedHours: null,
  coverUrl: null,
  pageUrl: null,
  statusId: null,
  store: null,
  kind: null,
  acquiredOn: null,
  familyOwner: null,
};

describe("search", () => {
  it("Otro usuario busca el juego", async () => {
    const igdb = createFakeIgdb([searchResult(1, "Hades")]);
    const service = buildService({ igdb });

    const results = await service.search("otro-usuario", "cartas");

    expect(results.map(({ title }) => title)).toEqual(["Hades"]);
  });

  it("marca un juego que ya está en la biblioteca", async () => {
    const igdb = createFakeIgdb([searchResult(1, "Hades")]);
    const gameRepo = createFakeGameRepo([], [{ igdbId: 1, gameId: "hades", statusSystemKey: "playing" }]);
    const service = buildService({ igdb, gameRepo });

    const [result] = await service.search(USER_ID, "hades");

    expect(result.mark).toEqual({ kind: "in_library", gameId: "hades" });
  });

  it("reconoce una edición por el id base", async () => {
    const igdb = createFakeIgdb([searchResult(7, "Civilization VI: Platinum", 42)]);
    const gameRepo = createFakeGameRepo([], [{ igdbId: 42, gameId: "civ", statusSystemKey: "backlog" }]);
    const service = buildService({ igdb, gameRepo });

    const [result] = await service.search(USER_ID, "civ");

    expect(result.mark).toEqual({ kind: "in_library", gameId: "civ" });
  });

  it("marca un juego que está en «Quiero jugarlo»", async () => {
    const igdb = createFakeIgdb([searchResult(1, "Frostpunk")]);
    const gameRepo = createFakeGameRepo([], [{ igdbId: 1, gameId: "frost", statusSystemKey: "wishlist" }]);
    const service = buildService({ igdb, gameRepo });

    const [result] = await service.search(USER_ID, "frost");

    expect(result.mark).toEqual({ kind: "wishlist", gameId: "frost" });
  });

  it("deja como nuevo un juego que no tiene", async () => {
    const igdb = createFakeIgdb([searchResult(1, "Hades")]);
    const service = buildService({ igdb });

    const [result] = await service.search(USER_ID, "hades");

    expect(result.mark).toEqual({ kind: "new" });
  });
});

describe("addFromIgdb", () => {
  it("Agregado sin copias", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Hades")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    await service.addFromIgdb(USER_ID, 1);

    expect(gameRepo.addIgdbGame).toHaveBeenCalledWith(USER_ID, igdbData(1, "Hades"), {
      statusId: "wishlist",
      statusSince: TODAY,
      copy: null,
    });
  });

  it("Agregar un juego repetido", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Civilization VI")]]));
    const gameRepo = createFakeGameRepo();
    gameRepo.addIgdbGame.mockResolvedValue({ kind: "already_in_library", gameId: "civ" });
    const service = buildService({ igdb, gameRepo });

    const result = await service.addFromIgdb(USER_ID, 1);

    expect(result).toEqual({ kind: "already_in_library", gameId: "civ" });
  });

  it("Agregar una edición", async () => {
    // El adapter resuelve la edición: al servicio le llega el juego base.
    const igdb = createFakeIgdb([], new Map([[7, igdbData(42, "Civilization VI")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    await service.addFromIgdb(USER_ID, 7);

    expect(gameRepo.addIgdbGame.mock.calls[0][1]).toMatchObject({ igdbId: 42, title: "Civilization VI" });
  });

  it("rechaza un juego que IGDB no encuentra", async () => {
    const service = buildService();

    const add = service.addFromIgdb(USER_ID, 999);

    await expect(add).rejects.toBeInstanceOf(GameNotFoundError);
  });
});

describe("addManual", () => {
  it("Agregado con copia", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, { ...MANUAL, store: { storeId: "itch" }, kind: "free" });

    expect(gameRepo.addManualGame.mock.calls[0][2]).toEqual({
      statusId: "backlog",
      statusSince: TODAY,
      copy: { storeId: "itch", kind: "free", acquiredOn: null, familyOwner: null },
    });
  });

  it("sin copia queda en «Quiero jugarlo»", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, MANUAL);

    expect(gameRepo.addManualGame.mock.calls[0][2].statusId).toBe("wishlist");
    expect(gameRepo.addManualGame.mock.calls[0][2].copy).toBeNull();
  });

  it.each([
    { description: "tienda sin tipo", partial: { store: { storeId: "itch" } } },
    { description: "tipo sin tienda", partial: { kind: "free" as const } },
  ])("con $description no crea una copia", async ({ partial }) => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, { ...MANUAL, ...partial });

    expect(gameRepo.addManualGame.mock.calls[0][2].copy).toBeNull();
  });

  it("con tienda «Otra» crea la tienda propia", async () => {
    const storeRepo = createFakeStoreRepo();
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo, storeResolver: fakeStoreResolver(storeRepo) });

    await service.addManual(USER_ID, { ...MANUAL, store: { otherName: "Humble Store" }, kind: "purchased" });

    expect(storeRepo.insertOwn).toHaveBeenCalledWith(USER_ID, "Humble Store", "humble-store");
    expect(gameRepo.addManualGame.mock.calls[0][2].copy?.storeId).toBe("propia-humble-store");
  });

  it("respeta el estado elegido", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, { ...MANUAL, statusId: "completed" });

    expect(gameRepo.addManualGame.mock.calls[0][2].statusId).toBe("completed");
  });

  it("rechaza un estado ajeno", async () => {
    const service = buildService();

    const add = service.addManual(USER_ID, { ...MANUAL, statusId: "estado-ajeno" });

    await expect(add).rejects.toBeInstanceOf(StatusNotFoundError);
  });

  it("rechaza una tienda ajena", async () => {
    const service = buildService();

    const add = service.addManual(USER_ID, { ...MANUAL, store: { storeId: "ajena" }, kind: "free" });

    await expect(add).rejects.toBeInstanceOf(StoreNotFoundError);
  });
});
