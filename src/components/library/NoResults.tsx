import controls from "@/components/ui/controls.module.css";

import styles from "./NoResults.module.css";

export function NoResults({ onClear }: Readonly<{ onClear: () => void }>) {
  return (
    <section className={styles.empty}>
      <p className={styles.text}>No hay juegos con esta combinación de filtros.</p>
      <button type="button" className={controls.secondary} onClick={onClear}>
        Limpiar filtros
      </button>
    </section>
  );
}
