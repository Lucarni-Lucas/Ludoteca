"use client";

import { useRef, useState } from "react";

import { type CopyRowDraft, EMPTY_COPY_ROW } from "@/components/copy/CopyRowFields";

/** La clave identifica la fila en React: quitar la del medio no le pasa sus datos a la siguiente. */
export type KeyedCopyRow = CopyRowDraft & Readonly<{ key: number }>;

/** Las filas de «Dónde y cómo lo tenés»: arrancan vacías y se suman, cambian o quitan antes de guardar. */
export function useCopyRows() {
  const [rows, setRows] = useState<readonly KeyedCopyRow[]>([]);
  const nextKey = useRef(0);

  function add(): void {
    const key = nextKey.current;
    nextKey.current = key + 1;
    setRows((current) => [...current, { ...EMPTY_COPY_ROW, key }]);
  }

  function update(key: number, changes: Partial<CopyRowDraft>): void {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  function remove(key: number): void {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return { rows, add, update, remove };
}
