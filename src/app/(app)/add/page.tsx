import { requireSessionUser } from "@/security/session";
import { getCopyService } from "@/service/copy/instance";
import { getStatusService } from "@/service/status/instance";

import { AddGameScreen } from "./add-game-screen";

// Usa la base: corta mucho antes de los 300 s por defecto de Vercel (design.md §17).
export const maxDuration = 20;

export default async function AddGamePage() {
  const user = await requireSessionUser();
  const [stores, statusGroups] = await Promise.all([
    getCopyService().listStores(user.id),
    getStatusService().listGrouped(user.id),
  ]);

  return <AddGameScreen stores={stores} statusGroups={statusGroups} />;
}
