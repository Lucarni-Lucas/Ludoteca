import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./NoResults.module.css";

export function NoResults({ onClear }: Readonly<{ onClear: () => void }>) {
  const t = useTranslations("library");

  return (
    <section className={styles.empty}>
      <p className={styles.text}>{t("noResults")}</p>
      <button type="button" className={controls.secondary} onClick={onClear}>
        {t("clearFilters")}
      </button>
    </section>
  );
}
