import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";

import styles from "./LibraryToolbar.module.css";

type LibraryToolbarProps = Readonly<{
  title: string;
  onTitleChange: (title: string) => void;
  onStartSelection: () => void;
}>;

export function LibraryToolbar({ title, onTitleChange, onStartSelection }: LibraryToolbarProps) {
  const t = useTranslations("library");

  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <span className={controls.visuallyHidden}>{t("search")}</span>
        {/* type="text": el searchbox de la página es el de ¿Lo tengo?, en el encabezado. */}
        <input
          className={styles.searchInput}
          type="text"
          placeholder={t("searchPlaceholder")}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <button type="button" className={controls.secondary} onClick={onStartSelection}>
        {t("select")}
      </button>
    </div>
  );
}
