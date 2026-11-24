import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readIgnExport } from "@/adapter/ign/ign-adapter";
import { readPlayniteExport } from "@/adapter/playnite/playnite-adapter";
import { UnknownImportFileError } from "@/model/import/errors";
import { createImportService } from "@/service/import/import-service";

import { EPIC, STEAM } from "../../model/import/import-fixtures";
import { setup, USER_ID } from "./fakes";

const IGN_SAMPLE = readFileSync(path.resolve("tests/adapter/ign/ign-export-sample.json"), "utf8");
const PLAYNITE_SAMPLE = readFileSync(path.resolve("tests/adapter/playnite/playnite-export-sample.json"), "utf8");

function withReaders() {
  const context = setup();
  const service = createImportService({ ...context.dependencies, fileReaders: [readIgnExport, readPlayniteExport] });
  return { ...context, service };
}

describe("loadFile", () => {
  it("Archivo de IGN", async () => {
    const { service, importRepo } = withReaders();

    const loaded = await service.loadFile(USER_ID, IGN_SAMPLE);

    expect(loaded).toEqual({ source: "ign", read: 9, skipped: 0 });
    expect(importRepo.state.saved).toHaveLength(9);
    expect(importRepo.state.saved[0]).toMatchObject({ source: "ign", storeId: null, steamAppId: "1966900" });
  });

  it("guarda las filas de Playnite con el id de su tienda", async () => {
    const { service, importRepo } = withReaders();

    const loaded = await service.loadFile(USER_ID, PLAYNITE_SAMPLE);

    expect(loaded).toMatchObject({ source: "playnite", read: 9 });
    const stores = new Map(importRepo.state.saved.map((item) => [item.title, item.storeId]));
    expect(stores.get("Grand Theft Auto V")).toBe(EPIC.id);
    expect(stores.get("Portal 2")).toBe(STEAM.id);
  });

  it("una tienda desconocida de Playnite se crea como tienda propia", async () => {
    const { service, importRepo, stores } = withReaders();
    const content = JSON.stringify({
      generator: { name: "Playnite Library Exporter" },
      schemaVersion: 1,
      games: [{ name: "Juego Raro", sourceName: "Tienda Rara", providerGameId: "raro" }],
    });

    await service.loadFile(USER_ID, content);

    expect(stores.insertOwn).toHaveBeenCalledWith(USER_ID, "Tienda Rara", "tienda-rara");
    expect(importRepo.state.saved[0].storeId).toBe("propia-tienda-rara");
  });

  it("Archivo desconocido", async () => {
    const { service, importRepo } = withReaders();

    const load = service.loadFile(USER_ID, JSON.stringify({ juegos: [{ nombre: "Hades" }] }));

    await expect(load).rejects.toBeInstanceOf(UnknownImportFileError);
    expect(importRepo.upsertItems).not.toHaveBeenCalled();
  });

  it("un JSON roto da «No reconozco este archivo» y no guarda nada", async () => {
    const { service, importRepo } = withReaders();

    const load = service.loadFile(USER_ID, '{ "records": [');

    await expect(load).rejects.toBeInstanceOf(UnknownImportFileError);
    expect(importRepo.upsertItems).not.toHaveBeenCalled();
  });
});
