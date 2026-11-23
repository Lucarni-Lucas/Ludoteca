import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./LoadError.module.css";

export function LoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const t = useTranslations("nav");

  return (
    <section className={styles.panel} role="alert">
      <p className={styles.text}>{t("loadError")}</p>
      <button type="button" className={controls.primary} onClick={onRetry}>
        {t("retry")}
      </button>
    </section>
  );
}
