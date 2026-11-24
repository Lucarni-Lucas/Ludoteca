import { getTranslations } from "next-intl/server";

import { IgnGuide } from "@/components/import/IgnGuide";
import { BackLink } from "@/components/layout/BackLink";
import { getImportGuideService } from "@/service/import/instance";

import styles from "../guide.module.css";

/** Sin base: no declara `maxDuration` (design.md §2). */
export default async function IgnGuidePage() {
  const t = await getTranslations("import.guides");
  // Los avisos del marcador van en el idioma del usuario: corren en IGN, lejos de los catálogos.
  const bookmarklet = getImportGuideService().ignBookmarklet({
    wrongSite: t("ign.alerts.wrongSite"),
    signedOut: t("ign.alerts.signedOut"),
    failed: t("ign.alerts.failed"),
    empty: t("ign.alerts.empty"),
  });

  return (
    <div className={styles.page}>
      <BackLink href="/import" label={t("back")} accessibleLabel={t("back")} />
      <IgnGuide bookmarklet={bookmarklet} />
    </div>
  );
}
