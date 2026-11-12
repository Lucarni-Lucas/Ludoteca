import controls from "@/components/ui/controls.module.css";

import styles from "./LoadError.module.css";

export function LoadError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <section className={styles.panel} role="alert">
      <p className={styles.text}>No pudimos cargar tus datos. Probá de nuevo.</p>
      <button type="button" className={controls.primary} onClick={onRetry}>
        Reintentar
      </button>
    </section>
  );
}
