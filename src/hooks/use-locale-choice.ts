"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useServerAction } from "@/hooks/use-server-action";
import type { Locale } from "@/model/account/locale";
import type { LocaleChange } from "@/model/account/settings";
import type { ActionResult } from "@/shared/action-result";

export type ChooseLocaleAction = (locale: Locale) => Promise<ActionResult<LocaleChange>>;

export function useLocaleChoice(action: ChooseLocaleAction) {
  const router = useRouter();
  const { pending, errorMessage, run } = useServerAction(action);
  const [refreshing, startTransition] = useTransition();
  const [change, setChange] = useState<LocaleChange | null>(null);

  async function choose(locale: Locale): Promise<void> {
    setChange(null);
    const result = await run(locale);

    if (result.ok) {
      // En la misma transición que el refresco: el aviso aparece recién con la pantalla en el idioma nuevo.
      startTransition(() => {
        setChange(result.data);
        router.refresh();
      });
    }
  }

  return { pending: pending || refreshing, errorMessage, change, choose };
}
