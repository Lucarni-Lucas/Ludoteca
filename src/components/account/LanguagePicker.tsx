import { useTranslations } from "next-intl";
import { useId } from "react";

import controls from "@/components/ui/controls.module.css";
import { Notice } from "@/components/ui/Notice";
import { htmlLang, type Locale, LOCALES } from "@/model/account/locale";
import type { LocaleChange } from "@/model/account/settings";

import styles from "./LanguagePicker.module.css";

type LanguagePickerProps = Readonly<{
  value: Locale;
  pending: boolean;
  change: LocaleChange | null;
  onChoose: (locale: Locale) => void;
}>;

/** Dos botones y no un `select`: con dos opciones se ven las dos sin abrir nada (design.md §1). */
export function LanguagePicker({ value, pending, change, onChoose }: LanguagePickerProps) {
  const t = useTranslations("settings.language");
  const titleId = useId();

  return (
    <section className={styles.block}>
      <h3 id={titleId} className={styles.title}>
        {t("title")}
      </h3>
      <div role="group" aria-labelledby={titleId} className={styles.options}>
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            // Cada opción en su idioma: el lector de pantalla pronuncia «English» en inglés aunque la página esté en español.
            lang={htmlLang(locale)}
            className={controls.pill}
            aria-pressed={value === locale}
            disabled={pending}
            onClick={() => onChoose(locale)}
          >
            {t(locale)}
          </button>
        ))}
      </div>
      <Notice message={change ? t(change) : null} />
    </section>
  );
}
