import Link from "next/link";
import { useTranslations } from "next-intl";

import styles from "./SettingsNav.module.css";

/** Por ahora Cuenta es la única opción: las demás del diseño llegan con sus etapas. */
export function SettingsNav() {
  const t = useTranslations("settings");

  return (
    <nav aria-label={t("nav")} className={styles.nav}>
      <Link href="/settings/account" aria-current="page" className={styles.link}>
        {t("account")}
      </Link>
    </nav>
  );
}
