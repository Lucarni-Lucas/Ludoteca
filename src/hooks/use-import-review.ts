"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import {
  confirmImportAction,
  connectSteamAction,
  decideAction,
  getImportOverviewAction,
  refreshSteamAction,
  searchAgainAction,
} from "@/app/(app)/import/actions";
import type { IgdbSearchResult } from "@/model/game/catalog";
import type { ImportSummary } from "@/model/import/confirm";
import type { ImportDecision } from "@/model/import/decision";
import type { ImportSource } from "@/model/import/import-row";
import type { FileLoaded, ImportOverview } from "@/service/import/import-service";
import type { ActionResult } from "@/shared/action-result";

const IMPORT_FILE_URL = "/api/import/file";

/** Lo que dice cada tarjeta de fuente después de subir, conectar o fallar. */
export type SourceFeedback = Readonly<{ kind: "ok" | "error"; message: string }>;

type Busy = ImportSource | "decide" | "confirm" | null;

/** `failedMessage` es para cuando no llega respuesta del servidor, que si no trae su propio mensaje traducido. */
async function postFile(file: File, failedMessage: string): Promise<ActionResult<FileLoaded>> {
  const form = new FormData();
  form.set("file", file);

  try {
    const response = await fetch(IMPORT_FILE_URL, { method: "POST", body: form });
    return (await response.json()) as ActionResult<FileLoaded>;
  } catch {
    // Sin red no hay respuesta que traducir: se muestra el texto genérico.
    return { ok: false, error: { code: "INTERNAL_ERROR", message: failedMessage } };
  }
}

export function useImportReview(initial: ImportOverview) {
  const t = useTranslations("import.sources");
  const failedMessage = useTranslations("errors")("INTERNAL_ERROR");
  const [overview, setOverview] = useState(initial);
  const [busy, setBusy] = useState<Busy>(null);
  const [feedback, setFeedback] = useState<Partial<Record<ImportSource, SourceFeedback>>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const refresh = useCallback(async () => {
    const result = await getImportOverviewAction();

    if (result.ok) {
      setOverview(result.data);
    }

    return result.ok ? result.data : null;
  }, []);

  function tell(source: ImportSource, value: SourceFeedback) {
    setFeedback((current) => ({ ...current, [source]: value }));
  }

  async function runSource<T>(source: ImportSource, action: () => Promise<ActionResult<T>>, message: (data: T) => string) {
    setBusy(source);
    const result = await action();
    setBusy(null);

    if (!result.ok) {
      tell(source, { kind: "error", message: result.error.message });
      return null;
    }

    tell(source, { kind: "ok", message: message(result.data) });
    return refresh();
  }

  function uploadFile(source: ImportSource, file: File) {
    return runSource(source, () => postFile(file, failedMessage), (loaded) =>
      [t("loaded", { count: loaded.read }), loaded.skipped > 0 ? t("skipped", { count: loaded.skipped }) : ""]
        .filter(Boolean)
        .join(" "),
    );
  }

  function connectSteam(profile: string) {
    return runSource("steam", () => connectSteamAction(profile), (connected) => t("steam.connected", { count: connected.read }));
  }

  function refreshSteam() {
    return runSource("steam", () => refreshSteamAction(), (connected) => t("steam.connected", { count: connected.read }));
  }

  async function runReview(action: () => Promise<ActionResult<ImportOverview>>): Promise<boolean> {
    setBusy("decide");
    setErrorMessage(null);
    const result = await action();
    setBusy(null);

    if (!result.ok) {
      setErrorMessage(result.error.message);
      return false;
    }

    setOverview(result.data);
    return true;
  }

  function decide(entryIds: readonly string[], decision: ImportDecision) {
    return runReview(() => decideAction([...entryIds], decision));
  }

  function searchAgain(entryId: string, chosen: IgdbSearchResult) {
    return runReview(() => searchAgainAction(entryId, chosen));
  }

  async function confirm() {
    setBusy("confirm");
    setErrorMessage(null);
    const result = await confirmImportAction();
    setBusy(null);

    if (!result.ok) {
      setErrorMessage(result.error.message);
      return;
    }

    setSummary(result.data);
    await refresh();
  }

  return { overview, busy, feedback, errorMessage, summary, refresh, uploadFile, connectSteam, refreshSteam, decide, searchAgain, confirm };
}
