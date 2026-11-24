import Link from "next/link";
import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./LibraryEmpty.module.css";

/** Una biblioteca sin juegos no muestra filtros: ofrece las dos formas de empezar, agregar uno o importar. */
export function LibraryEmpty() {
  const t = useTranslations("library");

  return (
    <section className={styles.empty}>
      <p className={styles.text}>{t("empty")}</p>
      <div className={styles.actions}>
        <Link href="/add" className={controls.primary}>
          {t("emptyAction")}
        </Link>
        <Link href="/import" className={controls.secondary}>
          {t("emptyImport")}
        </Link>
      </div>
    </section>
  );
}
