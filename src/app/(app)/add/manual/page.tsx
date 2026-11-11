import { BackLink } from "@/components/layout/BackLink";
import { requireSessionUser } from "@/security/session";
import { getCopyService } from "@/service/copy/instance";
import { getStatusService } from "@/service/status/instance";

import { ManualGameSection } from "../manual-game-section";
import styles from "./page.module.css";

export default async function ManualGamePage() {
  const user = await requireSessionUser();
  const [stores, statusGroups] = await Promise.all([
    getCopyService().listStores(user.id),
    getStatusService().listGrouped(user.id),
  ]);

  return (
    <div className={styles.page}>
      <BackLink href="/add" label="Agregar juego" accessibleLabel="Volver a la búsqueda" />
      <div>
        <h1 className={styles.title}>Agregar a mano</h1>
        <p className={styles.subtitle}>Para juegos que no están en IGDB: indies de itch.io, game jams, mods.</p>
      </div>
      <ManualGameSection stores={stores} statusGroups={statusGroups} />
    </div>
  );
}
