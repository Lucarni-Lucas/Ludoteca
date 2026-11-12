import { describe, expect, it, vi } from "vitest";

import { GameNotFoundError } from "@/model/game/errors";
import { StoreNotFoundError } from "@/model/store/errors";
import { InvalidStoreNameError } from "@/model/store/errors";
import { createCopyService } from "@/service/copy/copy-service";

import { buildGame, statusByKey } from "../../model/game/library-fixtures";
import { clock, createFakeGameRepo, createFakeStoreRepo, fakeStoreResolver, statusService, TODAY, USER_ID } from "../game/fakes";

function createFakeCopyRepo() {
  return {
    addCopy: vi.fn(async () => undefined),
    markLost: vi.fn(async () => undefined),
    recover: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

function buildService(games = [buildGame({ id: "juego" })], storeRepo = createFakeStoreRepo()) {
  const copyRepo = createFakeCopyRepo();
  const gameRepo = createFakeGameRepo(games);
  const service = createCopyService({
    gameRepo,
    copyRepo,
    storeRepo,
    statusService,
    storeResolver: fakeStoreResolver(storeRepo),
    clock,
  });

  return { service, copyRepo, gameRepo, storeRepo };
}

const PURCHASED = { store: { storeId: "steam" }, kind: "purchased" as const, acquiredOn: null, familyOwner: null };

describe("addCopy", () => {
  it("Sin fecha", async () => {
    const { service, copyRepo } = buildService();

    await service.addCopy(USER_ID, "juego", PURCHASED);

    expect(copyRepo.addCopy).toHaveBeenCalledWith(
      USER_ID,
      "juego",
      { storeId: "steam", kind: "purchased", acquiredOn: null, familyOwner: null },
      null,
    );
  });

  it("Otra tienda", async () => {
    const { service, copyRepo, storeRepo } = buildService();

    await service.addCopy(USER_ID, "juego", { ...PURCHASED, store: { otherName: "Humble Store" } });

    expect(storeRepo.stores.map(({ name }) => name)).toContain("Humble Store");
    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[2]).toMatchObject({ storeId: "propia-humble-store" });
  });

  it("no crea otra tienda si escribe una que ya existe", async () => {
    const { service, storeRepo } = buildService();

    await service.addCopy(USER_ID, "juego", { ...PURCHASED, store: { otherName: "STEAM" } });

    expect(storeRepo.insertOwn).not.toHaveBeenCalled();
  });

  it("rechaza un nombre de tienda sin letras ni números", async () => {
    const { service } = buildService();

    const add = service.addCopy(USER_ID, "juego", { ...PURCHASED, store: { otherName: "¿?" } });

    await expect(add).rejects.toBeInstanceOf(InvalidStoreNameError);
  });

  it("rechaza una tienda ajena", async () => {
    const { service } = buildService();

    const add = service.addCopy(USER_ID, "juego", { ...PURCHASED, store: { storeId: "ajena" } });

    await expect(add).rejects.toBeInstanceOf(StoreNotFoundError);
  });

  it("rechaza un juego ajeno", async () => {
    const { service, copyRepo } = buildService();

    const add = service.addCopy(USER_ID, "juego-ajeno", PURCHASED);

    await expect(add).rejects.toBeInstanceOf(GameNotFoundError);
    expect(copyRepo.addCopy).not.toHaveBeenCalled();
  });

  it("descarta «de quién es» si la copia no es Familia", async () => {
    const { service, copyRepo } = buildService();

    await service.addCopy(USER_ID, "juego", { ...PURCHASED, familyOwner: "Martín" });

    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[2]).toMatchObject({ familyOwner: null });
  });

  it("Compra de un juego deseado", async () => {
    const game = buildGame({ id: "frostpunk", title: "Frostpunk", status: statusByKey("wishlist") });
    const { service, copyRepo } = buildService([game]);

    const result = await service.addCopy(USER_ID, "frostpunk", PURCHASED);

    expect(result.notice).toBe("Frostpunk pasó a «Pendiente»");
    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[3]).toEqual({
      statusId: "backlog",
      statusSince: TODAY,
      entry: { occurredOn: TODAY, fromStatusId: "wishlist", toStatusId: "backlog" },
    });
  });

  it("Copia que no es propia", async () => {
    const game = buildGame({ id: "frostpunk", status: statusByKey("wishlist") });
    const { service, copyRepo } = buildService([game]);

    const result = await service.addCopy(USER_ID, "frostpunk", { ...PURCHASED, kind: "subscription" });

    expect(result.notice).toBeNull();
    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[3]).toBeNull();
  });

  it("no mueve un juego que no está en «Quiero jugarlo»", async () => {
    const game = buildGame({ id: "hades", status: statusByKey("playing") });
    const { service, copyRepo } = buildService([game]);

    const result = await service.addCopy(USER_ID, "hades", PURCHASED);

    expect(result.notice).toBeNull();
    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[3]).toBeNull();
  });
});

describe("marcar «Ya no lo tengo»", () => {
  it("Se pierde la única copia", async () => {
    const game = buildGame({ id: "ori", status: statusByKey("completed"), score: 8.8 });
    const { service, copyRepo, gameRepo } = buildService([game]);

    await service.markLost(USER_ID, "copia", "subscription_ended", null);

    expect(copyRepo.markLost).toHaveBeenCalledWith(USER_ID, "copia", {
      lostAt: TODAY,
      lostReason: "subscription_ended",
    });
    expect(gameRepo.applyStatusChange).not.toHaveBeenCalled();
    expect(gameRepo.updateScore).not.toHaveBeenCalled();
  });

  it("respeta la fecha elegida", async () => {
    const { service, copyRepo } = buildService();

    await service.markLost(USER_ID, "copia", "sold", "2026-05-01");

    expect(copyRepo.markLost).toHaveBeenCalledWith(USER_ID, "copia", { lostAt: "2026-05-01", lostReason: "sold" });
  });

  it("Deshacer", async () => {
    const { service, copyRepo } = buildService();

    await service.recover(USER_ID, "copia");

    expect(copyRepo.recover).toHaveBeenCalledWith(USER_ID, "copia");
  });
});

describe("addCopy de tipo Otro", () => {
  const GIFT = { store: { storeId: "steam" }, kind: "other" as const, acquiredOn: null, familyOwner: null, kindDetail: "Regalo" };

  it("Regalo de un juego deseado", async () => {
    const game = buildGame({ id: "silksong", title: "Hollow Knight: Silksong", status: statusByKey("wishlist") });
    const { service, copyRepo } = buildService([game]);

    const result = await service.addCopy(USER_ID, "silksong", GIFT);

    expect(result.notice).toBe("Hollow Knight: Silksong pasó a «Pendiente»");
    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[2]).toMatchObject({ kind: "other", kindDetail: "Regalo" });
    expect((copyRepo.addCopy.mock.calls[0] as unknown[])[3]).toMatchObject({ statusId: "backlog" });
  });

  it("Otro sin detalle", async () => {
    const { service, copyRepo } = buildService();

    await service.addCopy(USER_ID, "juego", { ...GIFT, kindDetail: null });

    expect(copyRepo.addCopy).toHaveBeenCalledWith(
      USER_ID,
      "juego",
      { storeId: "steam", kind: "other", acquiredOn: null, familyOwner: null },
      null,
    );
  });

  it("Detalle demasiado largo", async () => {
    const { service, copyRepo, storeRepo } = buildService();

    const adding = service.addCopy(USER_ID, "juego", { ...GIFT, store: { otherName: "Humble Store" }, kindDetail: "a".repeat(41) });

    await expect(adding).rejects.toThrow("El detalle puede tener hasta 40 caracteres");
    expect(copyRepo.addCopy).not.toHaveBeenCalled();
    expect(storeRepo.insertOwn).not.toHaveBeenCalled();
  });
});
