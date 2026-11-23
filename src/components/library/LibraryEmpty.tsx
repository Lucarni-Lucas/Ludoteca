import Link from "next/link";
import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./LibraryEmpty.module.css";

/** Una biblioteca sin juegos no muestra filtros: no hay nada que filtrar y solo distraerían. */
export function LibraryEmpty() {
  const t = useTranslations("library");

  return (
    <section className={styles.empty}>
      <p className={styles.text}>{t("empty")}</p>
      <Link href="/add" className={controls.primary}>
        {t("emptyAction")}
      </Link>
    </section>
  );
}
