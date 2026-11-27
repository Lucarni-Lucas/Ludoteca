"use client";

import { useState } from "react";

import { type CopyRowDraft, toCopyRowValues } from "@/components/copy/CopyRowFields";
import { chosenOrBacklog, COMPLETED_KEY, endlessChangeOf, type StatusGroupView } from "@/model/status/status";

import { useCopyRows } from "./use-copy-rows";

/** Lo que manda cualquiera de las dos variantes del alta: copias, estado y puntaje. */
export type EntryValues = Readonly<{
  copies: readonly CopyRowDraft[];
  statusId: string;
  score: number | null;
  /** Solo si se escribió algo: vacío es «sin total a mano». */
  playedHours?: string;
  /** El aviso de «Sin fin» aceptado y la casilla «Lo completé al 100%» (`04` design.md §22). */
  acceptEndless?: boolean;
  hundredPercent?: boolean;
}>;

/** Arranca sin copias, en Backlog y sin puntaje: los valores del prototipo no son iniciales. */
export function useEntryForm(statusGroups: readonly StatusGroupView[]) {
  const copyRows = useCopyRows();
  const [statusId, setStatusId] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [playedHours, setPlayedHours] = useState("");
  const [hundredPercent, setHundredPercent] = useState(false);
  const [confirmingEndless, setConfirmingEndless] = useState(false);
  const chosen = chosenOrBacklog(statusGroups.flatMap(({ statuses }) => statuses), statusId);
  const completed = chosen?.systemKey === COMPLETED_KEY;
  // Un juego nuevo todavía no es sin fin: solo «Jugado» puede cambiar la marca.
  const endlessChange = chosen ? endlessChangeOf(false, chosen) : null;

  function values(acceptEndless = false): EntryValues {
    const played = playedHours.trim() === "" ? {} : { playedHours };
    return {
      copies: copyRows.rows.map(toCopyRowValues),
      statusId,
      score,
      ...played,
      ...(completed && hundredPercent ? { hundredPercent: true } : {}),
      ...(acceptEndless ? { acceptEndless: true } : {}),
    };
  }

  /** Al guardar, si el estado le pone la marca «Sin fin», primero el aviso (`04` design.md §22). */
  function submit(save: (entry: EntryValues) => void): void {
    if (endlessChange === null) {
      save(values());
      return;
    }

    setConfirmingEndless(true);
  }

  return {
    copyRows,
    statusId,
    setStatusId,
    score,
    setScore,
    playedHours,
    setPlayedHours,
    completed,
    hundredPercent,
    setHundredPercent,
    endlessChange,
    confirmingEndless,
    cancelEndless: () => setConfirmingEndless(false),
    acceptEndless: (save: (entry: EntryValues) => void) => save(values(true)),
    submit,
    values,
  };
}
