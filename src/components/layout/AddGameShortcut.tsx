import Link from "next/link";
import { useTranslations } from "next-intl";

import { PlusIcon } from "./icons";
import styles from "./AddGameShortcut.module.css";

const ICON_SIZE = 20;

/** Solo en el celu: en pantallas anchas, «Agregar juego» está siempre visible en el menú de arriba. */
export function AddGameShortcut() {
  const t = useTranslations("nav");

  return (
    <Link href="/add" aria-label={t("addGame")} className={styles.shortcut}>
      <PlusIcon size={ICON_SIZE} />
    </Link>
  );
}
