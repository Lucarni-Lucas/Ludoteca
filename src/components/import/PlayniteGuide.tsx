import { useTranslations } from "next-intl";

import { ExternalLink, ImportGuide, Mono } from "./ImportGuide";

/** El exportador vive en el repositorio de su autor: Ludoteca no lo hospeda (design.md §17). */
export const PLAYNITE_EXPORTER_URL = "https://github.com/Dawnflare/PlayniteLibraryExport";

/** «¿Cómo saco mi biblioteca de Playnite?»: una línea sobre Playnite y los pasos del exportador. */
export function PlayniteGuide() {
  const t = useTranslations("import.guides.playnite");

  return (
    <ImportGuide
      title={t("title")}
      lead={t("lead")}
      steps={[
        {
          id: "download",
          content: (
            <p>
              {t.rich("steps.download", {
                strong: (chunks) => <strong>{chunks}</strong>,
                link: (chunks) => <ExternalLink href={PLAYNITE_EXPORTER_URL}>{chunks}</ExternalLink>,
                mono: (chunks) => <Mono>{chunks}</Mono>,
              })}
            </p>
          ),
        },
        { id: "export", content: <p>{t.rich("steps.export", { strong: (chunks) => <strong>{chunks}</strong> })}</p> },
        { id: "upload", content: <p>{t("steps.upload")}</p> },
      ]}
    />
  );
}
