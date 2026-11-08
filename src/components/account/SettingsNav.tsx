import Link from "next/link";

import styles from "./SettingsNav.module.css";

/** Por ahora Cuenta es la única opción: las demás del diseño llegan con sus etapas. */
export function SettingsNav() {
  return (
    <nav aria-label="Ajustes" className={styles.nav}>
      <Link href="/settings/account" aria-current="page" className={styles.link}>
        Cuenta
      </Link>
    </nav>
  );
}
