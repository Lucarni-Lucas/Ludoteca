"use client";

import { useState } from "react";

import { type CopyRowDraft, toCopyRowValues } from "@/components/copy/CopyRowFields";

import { useCopyRows } from "./use-copy-rows";

/** Lo que manda cualquiera de las dos variantes del alta: copias, estado y puntaje. */
export type EntryValues = Readonly<{
  copies: readonly CopyRowDraft[];
  statusId: string;
  score: number | null;
}>;

/** Arranca sin copias, con «Según las copias» y sin puntaje: los valores del prototipo no son iniciales. */
export function useEntryForm() {
  const copyRows = useCopyRows();
  const [statusId, setStatusId] = useState("");
  const [score, setScore] = useState<number | null>(null);

  function values(): EntryValues {
    return { copies: copyRows.rows.map(toCopyRowValues), statusId, score };
  }

  return { copyRows, statusId, setStatusId, score, setScore, values };
}
