import type { IgdbSearchResult } from "@/model/game/catalog";
import {
  type ImportSummary,
  MAX_CONFIRM_ENTRIES,
  planImportConfirmation,
  splitConfirmationPlan,
} from "@/model/import/confirm";
import { type ImportDecision, planDecision } from "@/model/import/decision";
import { ImportEntryNotFoundError, InvalidImportDecisionError, UnknownImportFileError } from "@/model/import/errors";
import { isReviewExpired } from "@/model/import/expiry";
import type {
  DecisionWrite,
  ImportCandidate,
  MatchedGame,
  NewImportItem,
  OpenReview,
  SourceSummary,
} from "@/model/import/import-entry";
import type { ImportFileRead, ImportRow, ImportSource } from "@/model/import/import-row";
import { buildReview, countReady, type ImportReview, type ReadyCounts, type ReviewGame, reviewGame } from "@/model/import/review";
import { parseSteamAccount } from "@/model/store/steam-account";
import type { NewStoreConnection, StoreConnection } from "@/model/store/store-connection";
import { findStoreByName, STEAM_SLUG, type Store } from "@/model/store/store";
import type { Status } from "@/model/status/status";
import type { StoreResolver } from "@/service/copy/store-resolver";
import { appDateOf, type Clock } from "@/shared/clock";
import { InvalidRequestError } from "@/shared/app-error";

import { createMatchingStep, type MatchingIgdb, type MatchingRepo } from "./matching";

type ImportRepo = MatchingRepo &
  Readonly<{
    upsertItems(userId: string, items: readonly NewImportItem[]): Promise<unknown>;
    listOpenReview(userId: string): Promise<OpenReview>;
    summarizeSources(userId: string): Promise<readonly SourceSummary[]>;
    saveDecision(userId: string, entryIds: readonly string[], decision: DecisionWrite): Promise<void>;
    clearDecision(userId: string, entryIds: readonly string[]): Promise<void>;
    matchEntry(userId: string, entryId: string, game: MatchedGame, chosen: ImportCandidate): Promise<void>;
    applyConfirmation(userId: string, plan: ReturnType<typeof planImportConfirmation>): Promise<void>;
    discardOpenReview(userId: string): Promise<void>;
    lastOpenActivityAt(userId: string): Promise<Date | null>;
    touchOpenReview(userId: string): Promise<void>;
  }>;

type FileReader = (content: unknown) => ImportFileRead | null;

type SteamPort = Readonly<{
  isConfigured(): boolean;
  resolveVanity(name: string): Promise<string>;
  getOwnedGames(steamId: string): Promise<readonly ImportRow[]>;
}>;

export type ImportServiceDependencies = Readonly<{
  importRepo: ImportRepo;
  /** Los adapters de archivo, en el orden en que se prueban. */
  fileReaders: readonly FileReader[];
  igdb: MatchingIgdb;
  steam: SteamPort;
  connections: Readonly<{
    findByStore(userId: string, storeId: string): Promise<StoreConnection | null>;
    save(userId: string, value: NewStoreConnection): Promise<StoreConnection>;
  }>;
  stores: Readonly<{ listAvailable(userId: string): Promise<readonly Store[]> }>;
  storeResolver: StoreResolver;
  statusService: Readonly<{ listStatuses(userId: string): Promise<readonly Status[]> }>;
  clock: Clock;
}>;

export type FileLoaded = Readonly<{ source: ImportSource; read: number; skipped: number }>;

export type MatchingProgress = Readonly<{ done: number; total: number }>;

export type SteamState = Readonly<{ configured: boolean; accountId: string | null }>;

/** Lo leído de cada fuente, con el día en la zona horaria de la app (`23 nov`). */
export type SourceView = Readonly<{ source: ImportSource; itemCount: number; lastReadOn: string }>;

/** Todo lo que muestra `/import`. */
export type ImportOverview = Readonly<{
  review: ImportReview;
  ready: ReadyCounts;
  sources: readonly SourceView[];
  steam: SteamState;
  progress: MatchingProgress;
}>;

/** Lo que muestra `/import` al abrirla: si la revisión venció, ya se descartó y lo dice (design.md §18). */
export type ImportOpened = ImportOverview & Readonly<{ expired: boolean }>;

export type SteamConnected = Readonly<{ accountId: string; read: number }>;

export type ImportService = Readonly<{
  loadFile(userId: string, text: string): Promise<FileLoaded>;
  advanceMatching(userId: string): Promise<MatchingProgress>;
  connectSteam(userId: string, profile: string): Promise<SteamConnected>;
  refreshSteam(userId: string): Promise<SteamConnected>;
  getOverview(userId: string): Promise<ImportOverview>;
  /** Al abrir la pantalla: descarta la revisión si pasaron `REVIEW_EXPIRY_DAYS` sin tocarla. */
  openImport(userId: string): Promise<ImportOpened>;
  /** «Empezar de nuevo». */
  discardReview(userId: string): Promise<ImportOverview>;
  decide(userId: string, entryIds: readonly string[], decision: ImportDecision): Promise<ImportOverview>;
  searchAgain(userId: string, entryId: string, chosen: IgdbSearchResult): Promise<ImportOverview>;
  confirm(userId: string): Promise<ImportSummary>;
}>;

/** Un JSON roto no es un archivo de IGN ni de Playnite: da el mismo error, sin el detalle del parser. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UnknownImportFileError({ cause: error });
  }
}

function toSourceView({ source, itemCount, lastReadAt }: SourceSummary): SourceView {
  return { source, itemCount, lastReadOn: appDateOf(lastReadAt) };
}

function progressOf(open: OpenReview): MatchingProgress {
  return { done: open.itemCount - open.pendingCount, total: open.itemCount };
}

export function createImportService(deps: ImportServiceDependencies): ImportService {
  const { importRepo, igdb, steam, connections, stores, storeResolver, statusService, clock } = deps;
  const matching = createMatchingStep({ importRepo, igdb });

  /** Una tienda que no está entre las conocidas se crea como «Otra», igual que al agregar a mano. */
  async function resolveStores(userId: string, rows: readonly ImportRow[]): Promise<readonly NewImportItem[]> {
    const available = await stores.listAvailable(userId);
    const ids = new Map<string, string>();

    for (const name of new Set(rows.flatMap((row) => row.storeName ?? []))) {
      const known = findStoreByName(available, name) ?? (await storeResolver.resolve(userId, { otherName: name }));
      ids.set(name, known.id);
    }

    return rows.map(({ storeName, ...row }) => ({ ...row, storeId: storeName ? (ids.get(storeName) ?? null) : null }));
  }

  async function steamStore(userId: string): Promise<Store | undefined> {
    return (await stores.listAvailable(userId)).find((store) => store.slug === STEAM_SLUG);
  }

  async function steamConnection(userId: string): Promise<StoreConnection | null> {
    const store = await steamStore(userId);
    return store ? connections.findByStore(userId, store.id) : null;
  }

  async function steamState(userId: string): Promise<SteamState> {
    const connection = await steamConnection(userId);
    return { configured: steam.isConfigured(), accountId: connection?.accountId ?? null };
  }

  async function overview(userId: string): Promise<ImportOverview> {
    const [open, sources, steamNow] = await Promise.all([
      importRepo.listOpenReview(userId),
      importRepo.summarizeSources(userId),
      steamState(userId),
    ]);
    const review = buildReview(open, { steamConnected: steamNow.accountId !== null });

    return { review, ready: countReady(review), sources: sources.map(toSourceView), steam: steamNow, progress: progressOf(open) };
  }

  async function isExpired(userId: string): Promise<boolean> {
    const last = await importRepo.lastOpenActivityAt(userId);
    return last !== null && isReviewExpired(appDateOf(last), clock.today());
  }

  async function reviewGamesOf(userId: string, entryIds: readonly string[]): Promise<readonly ReviewGame[]> {
    const [open, steamNow] = await Promise.all([importRepo.listOpenReview(userId), steamConnection(userId)]);
    const context = { steamConnected: steamNow !== null };

    return entryIds.map((entryId) => {
      const entry = open.entries.find(({ id }) => id === entryId);
      const game = entry ? reviewGame(entry, open.library, context) : null;

      if (!game) {
        throw new ImportEntryNotFoundError();
      }

      return game;
    });
  }

  async function matchCandidates(userId: string, chosen: readonly Readonly<{ entryId: string; candidate: ImportCandidate }>[]) {
    if (chosen.length === 0) {
      return;
    }

    const games = await igdb.getGamesData(chosen.map(({ candidate }) => candidate.igdbId));

    for (const { entryId, candidate } of chosen) {
      const game = games.get(candidate.igdbId);

      if (!game) {
        throw new InvalidImportDecisionError();
      }

      await importRepo.matchEntry(userId, entryId, game, candidate);
    }
  }

  async function connect(userId: string, accountId: string): Promise<SteamConnected> {
    // Si el perfil es privado, esto falla antes de guardar nada: la cuenta no queda conectada.
    const rows = await steam.getOwnedGames(accountId);
    const store = await steamStore(userId);

    if (!store) {
      throw new InvalidRequestError();
    }

    await importRepo.upsertItems(userId, await resolveStores(userId, rows));
    await connections.save(userId, { storeId: store.id, accountId });
    await importRepo.touchOpenReview(userId);
    return { accountId, read: rows.length };
  }

  return {
    async loadFile(userId, text) {
      const content = parseJson(text);
      const read = deps.fileReaders.map((reader) => reader(content)).find((result) => result !== null);

      if (!read) {
        throw new UnknownImportFileError();
      }

      await importRepo.upsertItems(userId, await resolveStores(userId, read.rows));
      await importRepo.touchOpenReview(userId);
      return { source: read.source, read: read.rows.length, skipped: read.skipped };
    },

    async advanceMatching(userId) {
      await matching.advance(userId);
      return progressOf(await importRepo.listOpenReview(userId));
    },

    async connectSteam(userId, profile) {
      const account = parseSteamAccount(profile);
      const accountId = account.kind === "steam_id" ? account.steamId : await steam.resolveVanity(account.name);
      return connect(userId, accountId);
    },

    async refreshSteam(userId) {
      const connection = await steamConnection(userId);

      if (!connection) {
        throw new InvalidRequestError();
      }

      return connect(userId, connection.accountId);
    },

    getOverview: overview,

    async openImport(userId) {
      const expired = await isExpired(userId);

      if (expired) {
        await importRepo.discardOpenReview(userId);
      }

      return { ...(await overview(userId)), expired };
    },

    async discardReview(userId) {
      await importRepo.discardOpenReview(userId);
      return overview(userId);
    },

    async decide(userId, entryIds, decision) {
      const [games, statuses] = await Promise.all([reviewGamesOf(userId, entryIds), statusService.listStatuses(userId)]);
      const statusKeys = statuses.flatMap((status) => status.systemKey ?? []);
      const plan = planDecision(games, decision, { statusKeys });

      for (const { entryIds: ids, write } of plan.writes) {
        await importRepo.saveDecision(userId, ids, write);
      }

      if (plan.resets.length > 0) {
        await importRepo.clearDecision(userId, plan.resets);
      }

      await matchCandidates(userId, plan.candidates);
      await importRepo.touchOpenReview(userId);
      return overview(userId);
    },

    async searchAgain(userId, entryId, chosen) {
      await reviewGamesOf(userId, [entryId]);
      await matchCandidates(userId, [{ entryId, candidate: chosen }]);
      await importRepo.touchOpenReview(userId);
      return overview(userId);
    },

    async confirm(userId) {
      // Crea los estados por defecto si todavía no hay: el plan necesita sus ids.
      const statuses = await statusService.listStatuses(userId);
      const [open, connection] = await Promise.all([importRepo.listOpenReview(userId), steamConnection(userId)]);
      const plan = planImportConfirmation(open, { steamConnected: connection !== null, statuses, today: clock.today() });

      for (const part of splitConfirmationPlan(plan, MAX_CONFIRM_ENTRIES)) {
        await importRepo.applyConfirmation(userId, part);
      }

      // Lo que quedó sin confirmar sigue vivo: confirmar es tocar la importación.
      await importRepo.touchOpenReview(userId);
      return plan.summary;
    },
  };
}

