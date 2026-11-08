import Link from "next/link";

import { PlusIcon } from "./icons";
import styles from "./AddGameShortcut.module.css";

const ICON_SIZE = 20;

/** Solo en el celu: en pantallas anchas, «Agregar juego» está siempre visible en el menú de arriba. */
export function AddGameShortcut() {
  return (
    <Link href="/add" aria-label="Agregar juego" className={styles.shortcut}>
      <PlusIcon size={ICON_SIZE} />
    </Link>
  );
}
