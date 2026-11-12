"use client";

import { useState } from "react";

import { type CopyRowDraft, toCopyRowValues } from "@/components/copy/CopyRowFields";

import { useCopyRows } from "./use-copy-rows";

/** Lo que manda cualquiera de las dos variantes del alta: copias, estado y puntaje. */
export type EntryValues = Readonly<{
  copies: readonly CopyRowDraft[];
  statusId: string;
  score: number | null;
  /** Solo si se escribió algo: vacío es «sin total a mano». */
  playedHours?: string;
}>;

/** Arranca sin copias, con «Según las copias» y sin puntaje: los valores del prototipo no son iniciales. */
export function useEntryForm() {
  const copyRows = useCopyRows();
  const [statusId, setStatusId] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [playedHours, setPlayedHours] = useState("");

  function values(): EntryValues {
    const played = playedHours.trim() === "" ? {} : { playedHours };
    return { copies: copyRows.rows.map(toCopyRowValues), statusId, score, ...played };
  }

  return { copyRows, statusId, setStatusId, score, setScore, playedHours, setPlayedHours, values };
}
