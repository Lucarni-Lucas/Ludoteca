import Link from "next/link";

import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>No encontramos esa pantalla</h1>
      <p className={styles.text}>Puede que el link esté mal o que la pantalla ya no exista.</p>
      <Link href="/library" className={styles.link}>
        Volver a tu biblioteca
      </Link>
    </main>
  );
}
