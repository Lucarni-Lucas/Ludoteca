import Link from "next/link";
import { useTranslations } from "next-intl";

import styles from "./not-found.module.css";

export default function NotFound() {
  const t = useTranslations("nav.notFound");

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.text}>{t("text")}</p>
      <Link href="/library" className={styles.link}>
        {t("back")}
      </Link>
    </main>
  );
}
