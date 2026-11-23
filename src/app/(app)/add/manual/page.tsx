import { getTranslations } from "next-intl/server";

import { BackLink } from "@/components/layout/BackLink";
import { requireSessionUser } from "@/security/session";
import { getCopyService } from "@/service/copy/instance";
import { getStatusService } from "@/service/status/instance";

import { ManualGameSection } from "../manual-game-section";
import styles from "./page.module.css";

// Usa la base: corta mucho antes de los 300 s por defecto de Vercel (design.md §17).
export const maxDuration = 20;

export default async function ManualGamePage() {
  const user = await requireSessionUser();
  const t = await getTranslations("add.manualPage");
  const [stores, statusGroups] = await Promise.all([
    getCopyService().listStores(user.id),
    getStatusService().listGrouped(user.id),
  ]);

  return (
    <div className={styles.page}>
      <BackLink href="/add" label={t("back")} accessibleLabel={t("backLabel")} />
      <div>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </div>
      <ManualGameSection stores={stores} statusGroups={statusGroups} />
    </div>
  );
}
