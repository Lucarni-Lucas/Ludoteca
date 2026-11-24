import { avatarInitial } from "@/model/account/avatar";
import { IMPORT_SOURCES, type ImportSource } from "@/model/import/import-row";
import { requireSessionUser } from "@/security/session";
import { getImportService } from "@/service/import/instance";
import { getStatusService } from "@/service/status/instance";

import { ImportScreen } from "./import-screen";

// Usa la base: corta mucho antes de los 300 s por defecto de Vercel.
export const maxDuration = 20;

type ImportPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

/** `?source=steam` lleva el foco a esa fuente: lo usa Tiendas en `05` (design.md §2). */
function sourceOf(value: string | string[] | undefined): ImportSource | undefined {
  return IMPORT_SOURCES.find((source) => source === value);
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const user = await requireSessionUser();
  const [overview, statuses, params] = await Promise.all([
    getImportService().getOverview(user.id),
    getStatusService().listStatuses(user.id),
    searchParams,
  ]);

  return (
    <ImportScreen initial={overview} statuses={statuses} avatarInitial={avatarInitial(user)} focusSource={sourceOf(params.source)} />
  );
}
