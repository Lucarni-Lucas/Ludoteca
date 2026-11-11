import Link from "next/link";

import controls from "@/components/ui/controls.module.css";

import styles from "./LibraryEmpty.module.css";

/** Una biblioteca sin juegos no muestra filtros: no hay nada que filtrar y solo distraerían. */
export function LibraryEmpty() {
  return (
    <section className={styles.empty}>
      <p className={styles.text}>Todavía no cargaste ningún juego.</p>
      <Link href="/add" className={controls.primary}>
        Agregá tu primer juego
      </Link>
    </section>
  );
}
