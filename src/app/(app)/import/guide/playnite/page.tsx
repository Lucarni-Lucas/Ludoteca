import { getTranslations } from "next-intl/server";

import { BackLink } from "@/components/layout/BackLink";
import { PlayniteGuide } from "@/components/import/PlayniteGuide";

import styles from "../guide.module.css";

/** Sin base: no declara `maxDuration` (design.md §2). */
export default async function PlayniteGuidePage() {
  const t = await getTranslations("import.guides");

  return (
    <div className={styles.page}>
      <BackLink href="/import" label={t("back")} accessibleLabel={t("back")} />
      <PlayniteGuide />
    </div>
  );
}
