import { notFound } from "next/navigation";
import { z } from "zod";

import { requireSessionUser } from "@/security/session";
import { getCopyService } from "@/service/copy/instance";
import { getLibraryService } from "@/service/game/instance";
import { getStatusService } from "@/service/status/instance";

import { GameScreen } from "./game-screen";

// Usa la base: corta mucho antes de los 300 s por defecto de Vercel (design.md §17).
export const maxDuration = 20;

type GamePageProps = Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function GamePage({ params, searchParams }: GamePageProps) {
  const user = await requireSessionUser();
  const [{ id }, { copy }] = await Promise.all([params, searchParams]);

  // Un id mal formado es igual que uno inexistente: sin esto, la base rechazaría la consulta con un error.
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const [game, statusGroups, stores] = await Promise.all([
    getLibraryService().findGame(user.id, id),
    getStatusService().listGrouped(user.id),
    getCopyService().listStores(user.id),
  ]);

  if (!game) {
    notFound();
  }

  return <GameScreen game={game} statusGroups={statusGroups} stores={stores} openCopyDialog={copy === "new"} />;
}
