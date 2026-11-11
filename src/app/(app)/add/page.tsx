import { requireSessionUser } from "@/security/session";
import { getCopyService } from "@/service/copy/instance";
import { getStatusService } from "@/service/status/instance";

import { AddGameScreen } from "./add-game-screen";

export default async function AddGamePage() {
  const user = await requireSessionUser();
  const [stores, statusGroups] = await Promise.all([
    getCopyService().listStores(user.id),
    getStatusService().listGrouped(user.id),
  ]);

  return <AddGameScreen stores={stores} statusGroups={statusGroups} />;
}
