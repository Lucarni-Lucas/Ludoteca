import { describe, expect, it } from "vitest";

import { createImportService } from "@/service/import/import-service";

import { entry, ignItem, openReview, steamItem } from "../../model/import/import-fixtures";
import { createFakeIgdb, createFakeImportRepo, matchedGame, setup, TODAY, USER_ID } from "./fakes";

/** Un instante a media tarde de ese día argentino: la hora no cambia el día. */
function afternoonOf(day: string): Date {
  return new Date(`${day}T18:00:00Z`);
}

function withOpenReview(lastActivityDay: string | null) {
  const importRepo = createFakeImportRepo();
  importRepo.state.review = openReview([entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)])]);
  importRepo.state.lastActivityAt = lastActivityDay === null ? null : afternoonOf(lastActivityDay);
  return importRepo;
}

describe("discardReview", () => {
  it("Descartar la revisión", async () => {
    const { service, importRepo } = setup({ importRepo: withOpenReview(TODAY) });

    const overview = await service.discardReview(USER_ID);

    expect(importRepo.discardOpenReview).toHaveBeenCalledWith(USER_ID);
    expect(overview.review.groups.every((group) => group.games.length === 0)).toBe(true);
  });
});

describe("openImport", () => {
  it("Revisión abandonada", async () => {
    const { service, importRepo } = setup({ importRepo: withOpenReview("2026-11-15") });

    const opened = await service.openImport(USER_ID);

    expect(importRepo.discardOpenReview).toHaveBeenCalledWith(USER_ID);
    expect(opened.expired).toBe(true);
    expect(opened.review.groups.every((group) => group.games.length === 0)).toBe(true);
  });

  it("a los 7 días sin tocarla todavía no vence", async () => {
    const { service, importRepo } = setup({ importRepo: withOpenReview("2026-11-16") });

    const opened = await service.openImport(USER_ID);

    expect(importRepo.discardOpenReview).not.toHaveBeenCalled();
    expect(opened.expired).toBe(false);
    expect(opened.review.groups.some((group) => group.games.length > 0)).toBe(true);
  });

  it("sin revisión abierta no hay nada que vencer", async () => {
    const { service, importRepo } = setup({ importRepo: withOpenReview(null) });

    const opened = await service.openImport(USER_ID);

    expect(importRepo.discardOpenReview).not.toHaveBeenCalled();
    expect(opened.expired).toBe(false);
  });

  it("Revisión en uso", async () => {
    const importRepo = withOpenReview("2026-11-01");
    let today = "2026-11-01";
    importRepo.touchOpenReview.mockImplementation(async () => {
      importRepo.state.lastActivityAt = afternoonOf(today);
    });
    const { dependencies } = setup({ importRepo });
    const service = createImportService({ ...dependencies, clock: { today: () => today } });
    const beholder = importRepo.state.review.entries[0].id;
    const days = ["2026-11-04", "2026-11-07", "2026-11-10", "2026-11-13", "2026-11-16"];
    const expired: boolean[] = [];

    for (const day of days) {
      today = day;
      expired.push((await service.openImport(USER_ID)).expired);
      await service.decide(USER_ID, [beholder], { kind: "choose", choice: { kind: "keep" } });
    }

    expect(expired).toEqual([false, false, false, false, false]);
    expect(importRepo.discardOpenReview).not.toHaveBeenCalled();
  });
});

describe("tocar la importación", () => {
  it("subir un archivo, traer de Steam, decidir, buscar con otro nombre y confirmar renuevan la revisión", async () => {
    const crash = entry("Crash", [ignItem("Crash Bandicoot", { matchState: "not_found" })], { catalog: null, igdbId: null });
    const beholder = entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "1", 0)]);
    const importRepo = createFakeImportRepo();
    importRepo.state.review = openReview([crash, beholder]);
    const igdb = createFakeIgdb({ games: new Map([[3, matchedGame(3, "Crash Bandicoot")]]) });
    const { service, dependencies } = setup({ importRepo, igdb });
    const withReader = createImportService({ ...dependencies, fileReaders: [() => ({ source: "ign", rows: [], skipped: 0 })] });
    const chosen = { igdbId: 3, baseIgdbId: 3, title: "Crash Bandicoot", year: 1996, coverUrl: null };

    await withReader.loadFile(USER_ID, "{}");
    await service.connectSteam(USER_ID, "76561197960287930");
    await service.decide(USER_ID, [beholder.id], { kind: "choose", choice: { kind: "keep" } });
    await service.searchAgain(USER_ID, crash.id, chosen);
    await service.confirm(USER_ID);

    expect(importRepo.touchOpenReview).toHaveBeenCalledTimes(5);
  });

  it("cruzar en tandas no cuenta como tocarla", async () => {
    const { service, importRepo } = setup();

    await service.advanceMatching(USER_ID);

    expect(importRepo.touchOpenReview).not.toHaveBeenCalled();
  });
});
