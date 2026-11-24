import { useTranslations } from "next-intl";

import { BookmarkletLink } from "./BookmarkletLink";
import styles from "./ImportGuide.module.css";
import { ImportGuide, Mono } from "./ImportGuide";

/** «¿Cómo saco mi lista de IGN?»: el marcador para arrastrar, los pasos y el aviso de que puede fallar. */
export function IgnGuide({ bookmarklet }: Readonly<{ bookmarklet: string }>) {
  const t = useTranslations("import.guides.ign");

  return (
    <ImportGuide
      title={t("title")}
      lead={t("lead")}
      steps={[
        {
          id: "drag",
          content: (
            <>
              <p>{t("steps.drag")}</p>
              <BookmarkletLink code={bookmarklet} label={t("bookmarklet")} dragHint={t("dragHint")} />
              <p className={styles.note}>{t("barHint")}</p>
            </>
          ),
        },
        { id: "open", content: <p>{t("steps.open")}</p> },
        { id: "run", content: <p>{t.rich("steps.run", { mono: (chunks) => <Mono>{chunks}</Mono> })}</p> },
        { id: "upload", content: <p>{t("steps.upload")}</p> },
      ]}
    >
      <p className={styles.warning}>{t("warning")}</p>
    </ImportGuide>
  );
}
