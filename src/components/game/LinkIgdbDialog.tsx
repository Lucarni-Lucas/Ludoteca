"use client";

import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import type { MarkedSearchResult } from "@/model/game/add-game";

import { IgdbResults } from "./IgdbResults";

type LinkIgdbDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  results: readonly MarkedSearchResult[];
  noResults: boolean;
  searchError: string | null;
  pending: boolean;
  errorMessage: string | null;
  onQueryChange: (query: string) => void;
  onLink: (igdbId: number) => void;
}>;

export function LinkIgdbDialog({
  open,
  onOpenChange,
  query,
  results,
  noResults,
  searchError,
  pending,
  errorMessage,
  onQueryChange,
  onLink,
}: LinkIgdbDialogProps) {
  const t = useTranslations("game.link");

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <label className={controls.field}>
        {t("search")}
        <input
          className={controls.input}
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <IgdbResults
        results={results}
        renderAction={(result) => (
          <button
            type="button"
            className={controls.primary}
            disabled={pending}
            onClick={() => onLink(result.baseIgdbId)}
          >
            {t("action")}
          </button>
        )}
      />
      {noResults ? <p className={controls.hint}>{t("noResults")}</p> : null}
      {searchError ? <p className={controls.error}>{searchError}</p> : null}
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
