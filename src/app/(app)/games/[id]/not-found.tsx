import Link from "next/link";
import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./page.module.css";

export default function GameNotFound() {
  const t = useTranslations("game");

  return (
    <section className={styles.notFound}>
      <h1 className={styles.notFoundTitle}>{t("notFound")}</h1>
      <Link href="/library" className={controls.secondary}>
        {t("backLabel")}
      </Link>
    </section>
  );
}
