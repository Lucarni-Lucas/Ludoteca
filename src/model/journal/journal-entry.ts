// Cada etapa suma lo que usa: las sesiones llegan con `06-diario-y-estados-propios`.
export const JOURNAL_ENTRY_KINDS = ["status_change"] as const;

export type JournalEntryKind = (typeof JOURNAL_ENTRY_KINDS)[number];

/** Una fila nueva del diario, ya decidida por el modelo. */
export type StatusChangeEntry = Readonly<{
  occurredOn: string;
  fromStatusId: string;
  toStatusId: string;
}>;
