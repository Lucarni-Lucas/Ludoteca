import Link from "next/link";
import { useTranslations } from "next-intl";

import styles from "./SettingsNav.module.css";

/** Cuenta e Importar; las demás opciones del diseño llegan con sus etapas. Importar vive en `/import`. */
export function SettingsNav() {
  const t = useTranslations("settings");

  return (
    <nav aria-label={t("nav")} className={styles.nav}>
      <Link href="/settings/account" aria-current="page" className={styles.link}>
        {t("account")}
      </Link>
      <Link href="/import" className={styles.link}>
        {t("import")}
      </Link>
    </nav>
  );
}
