"use client";

import { useCallback, useState } from "react";

export function useSelection() {
  const [active, setActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const start = useCallback(() => setActive(true), []);

  const stop = useCallback(() => {
    setActive(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (!next.delete(id)) {
        next.add(id);
      }

      return next;
    });
  }, []);

  return { active, selectedIds, start, stop, toggle };
}
