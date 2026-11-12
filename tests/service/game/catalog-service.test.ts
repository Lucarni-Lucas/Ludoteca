import { describe, expect, it } from "vitest";

import { GameNotFoundError, ScoreOutOfRangeError } from "@/model/game/errors";
import { StatusNotFoundError } from "@/model/status/errors";
import { StoreNotFoundError } from "@/model/store/errors";
import {
  createCatalogService,
  EMPTY_ENTRY_INPUT,
  type ManualGameInput,
  type NewCopyInput,
} from "@/service/game/catalog-service";

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
  ...EMPTY_ENTRY_INPUT,
};

function copyRow(store: NewCopyInput["store"], kind: NewCopyInput["kind"]): NewCopyInput {
  return { store, kind, acquiredOn: null, familyOwner: null };
}

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

    await service.addFromIgdb(USER_ID, 1, EMPTY_ENTRY_INPUT);

    expect(gameRepo.addIgdbGame).toHaveBeenCalledWith(USER_ID, igdbData(1, "Hades"), {
      statusId: "wishlist",
      statusSince: TODAY,
      copies: [],
      score: null,
    });
  });

  it("Agregar un juego repetido", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Civilization VI")]]));
    const gameRepo = createFakeGameRepo();
    gameRepo.addIgdbGame.mockResolvedValue({ kind: "already_in_library", gameId: "civ" });
    const service = buildService({ igdb, gameRepo });

    const result = await service.addFromIgdb(USER_ID, 1, EMPTY_ENTRY_INPUT);

    expect(result).toEqual({ kind: "already_in_library", gameId: "civ" });
  });

  it("Agregar una edición", async () => {
    // El adapter resuelve la edición: al servicio le llega el juego base.
    const igdb = createFakeIgdb([], new Map([[7, igdbData(42, "Civilization VI")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    await service.addFromIgdb(USER_ID, 7, EMPTY_ENTRY_INPUT);

    expect(gameRepo.addIgdbGame.mock.calls[0][1]).toMatchObject({ igdbId: 42, title: "Civilization VI" });
  });

  it("rechaza un juego que IGDB no encuentra", async () => {
    const service = buildService();

    const add = service.addFromIgdb(USER_ID, 999, EMPTY_ENTRY_INPUT);

    await expect(add).rejects.toBeInstanceOf(GameNotFoundError);
  });
});

describe("addManual", () => {
  it("Agregado con copia", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, { ...MANUAL, copies: [copyRow({ storeId: "itch" }, "free")] });

    expect(gameRepo.addManualGame.mock.calls[0][2]).toEqual({
      statusId: "backlog",
      statusSince: TODAY,
      copies: [{ storeId: "itch", kind: "free", acquiredOn: null, familyOwner: null }],
      score: null,
    });
  });

  it("sin copia queda en «Quiero jugarlo»", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, MANUAL);

    expect(gameRepo.addManualGame.mock.calls[0][2].statusId).toBe("wishlist");
    expect(gameRepo.addManualGame.mock.calls[0][2].copies).toEqual([]);
  });

  it("con tienda «Otra» crea la tienda propia", async () => {
    const storeRepo = createFakeStoreRepo();
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo, storeResolver: fakeStoreResolver(storeRepo) });

    await service.addManual(USER_ID, { ...MANUAL, copies: [copyRow({ otherName: "Humble Store" }, "purchased")] });

    expect(storeRepo.insertOwn).toHaveBeenCalledWith(USER_ID, "Humble Store", "humble-store");
    expect(gameRepo.addManualGame.mock.calls[0][2].copies[0]?.storeId).toBe("propia-humble-store");
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

    const add = service.addManual(USER_ID, { ...MANUAL, copies: [copyRow({ storeId: "ajena" }, "free")] });

    await expect(add).rejects.toBeInstanceOf(StoreNotFoundError);
  });
});

describe("addManual con el año de lanzamiento", () => {
  it("Año negativo", async () => {
    const storeRepo = createFakeStoreRepo();
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo, storeResolver: fakeStoreResolver(storeRepo) });

    const add = service.addManual(USER_ID, {
      ...MANUAL,
      year: -2017,
      copies: [copyRow({ otherName: "Humble Store" }, "purchased")],
    });

    await expect(add).rejects.toThrow("Poné un año entre 1950 y 2027");
    expect(gameRepo.addManualGame).not.toHaveBeenCalled();
    expect(storeRepo.insertOwn).not.toHaveBeenCalled();
  });

  it("Año que viene", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, { ...MANUAL, year: 2027 });

    expect(gameRepo.addManualGame.mock.calls[0][1].year).toBe(2027);
  });

  it("Sin año", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, MANUAL);

    expect(gameRepo.addManualGame.mock.calls[0][1].year).toBeNull();
  });
});

describe("agregar con varias copias y puntaje", () => {
  it("Agregar con dos copias", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Civilization VI")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });
    const copies = [copyRow({ storeId: "itch" }, "free"), copyRow({ storeId: "steam" }, "purchased")];

    await service.addFromIgdb(USER_ID, 1, { ...EMPTY_ENTRY_INPUT, copies });

    const entry = gameRepo.addIgdbGame.mock.calls[0][2];
    expect(entry.statusId).toBe("backlog");
    expect(entry.copies).toEqual([
      { storeId: "itch", kind: "free", acquiredOn: null, familyOwner: null },
      { storeId: "steam", kind: "purchased", acquiredOn: null, familyOwner: null },
    ]);
  });

  it("Sin copias", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, { ...MANUAL, copies: [] });

    expect(gameRepo.addManualGame.mock.calls[0][2].copies).toEqual([]);
  });

  it("Fila incompleta", async () => {
    const storeRepo = createFakeStoreRepo();
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo, storeResolver: fakeStoreResolver(storeRepo) });
    const copies = [copyRow({ otherName: "Humble Store" }, "purchased"), copyRow(null, "free")];

    const add = service.addManual(USER_ID, { ...MANUAL, copies });

    await expect(add).rejects.toThrow("Elegí la tienda de cada copia");
    expect(gameRepo.addManualGame).not.toHaveBeenCalled();
    expect(storeRepo.insertOwn).not.toHaveBeenCalled();
  });

  it("dos filas con la misma tienda «Otra» la crean una sola vez", async () => {
    const storeRepo = createFakeStoreRepo();
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo, storeResolver: fakeStoreResolver(storeRepo) });
    const copies = [copyRow({ otherName: "Humble Store" }, "purchased"), copyRow({ otherName: "humble store" }, "free")];

    await service.addManual(USER_ID, { ...MANUAL, copies });

    expect(storeRepo.insertOwn).toHaveBeenCalledTimes(1);
    expect(gameRepo.addManualGame.mock.calls[0][2].copies.map(({ storeId }) => storeId)).toEqual([
      "propia-humble-store",
      "propia-humble-store",
    ]);
  });

  it("Agregar con puntaje", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Hades")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    await service.addFromIgdb(USER_ID, 1, { ...EMPTY_ENTRY_INPUT, score: 9.5 });

    expect(gameRepo.addIgdbGame.mock.calls[0][2].score).toBe(9.5);
  });

  it("Agregar sin tocar el puntaje", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Outer Wilds")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    await service.addFromIgdb(USER_ID, 1, EMPTY_ENTRY_INPUT);

    expect(gameRepo.addIgdbGame.mock.calls[0][2].score).toBeNull();
  });

  it("rechaza un puntaje fuera de rango sin consultar IGDB", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Hades")]]));
    const service = buildService({ igdb });

    const add = service.addFromIgdb(USER_ID, 1, { ...EMPTY_ENTRY_INPUT, score: 11 });

    await expect(add).rejects.toBeInstanceOf(ScoreOutOfRangeError);
    expect(igdb.getGame).not.toHaveBeenCalled();
  });

  it("guarda el detalle de una copia Otro", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });
    const gift = { ...copyRow({ storeId: "steam" }, "other"), kindDetail: "Regalo" };

    await service.addManual(USER_ID, { ...MANUAL, copies: [gift] });

    expect(gameRepo.addManualGame.mock.calls[0][2].copies[0]).toMatchObject({ kind: "other", kindDetail: "Regalo" });
  });
});

describe("agregar con horas jugadas", () => {
  it("Agregar con horas jugadas", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Outer Wilds")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    await service.addFromIgdb(USER_ID, 1, { ...EMPTY_ENTRY_INPUT, playedHours: 12.5 });

    expect(gameRepo.addIgdbGame.mock.calls[0][2].playedMinutes).toBe(750);
  });

  it("sin horas no carga un total a mano", async () => {
    const gameRepo = createFakeGameRepo();
    const service = buildService({ gameRepo });

    await service.addManual(USER_ID, MANUAL);

    expect(gameRepo.addManualGame.mock.calls[0][2]).not.toHaveProperty("playedMinutes");
  });

  it("Horas negativas al agregar no guardan nada", async () => {
    const igdb = createFakeIgdb([], new Map([[1, igdbData(1, "Outer Wilds")]]));
    const gameRepo = createFakeGameRepo();
    const service = buildService({ igdb, gameRepo });

    const add = service.addFromIgdb(USER_ID, 1, { ...EMPTY_ENTRY_INPUT, playedHours: -3 });

    await expect(add).rejects.toThrow("Poné las horas jugadas, de 0 en adelante");
    expect(igdb.getGame).not.toHaveBeenCalled();
    expect(gameRepo.addIgdbGame).not.toHaveBeenCalled();
  });
});
