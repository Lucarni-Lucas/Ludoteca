import Link from "next/link";

import controls from "@/components/ui/controls.module.css";

import styles from "./page.module.css";

export default function GameNotFound() {
  return (
    <section className={styles.notFound}>
      <h1 className={styles.notFoundTitle}>No encontramos este juego</h1>
      <Link href="/library" className={controls.secondary}>
        Volver a la biblioteca
      </Link>
    </section>
  );
}
