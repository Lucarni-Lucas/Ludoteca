import controls from "@/components/ui/controls.module.css";

import styles from "./LibraryToolbar.module.css";

type LibraryToolbarProps = Readonly<{
  title: string;
  onTitleChange: (title: string) => void;
  onStartSelection: () => void;
}>;

export function LibraryToolbar({ title, onTitleChange, onStartSelection }: LibraryToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <label className={styles.search}>
        <span className={controls.visuallyHidden}>Buscar por título</span>
        {/* type="text": el searchbox de la página es el de ¿Lo tengo?, en el encabezado. */}
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscá por título…"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </label>
      <button type="button" className={controls.secondary} onClick={onStartSelection}>
        Seleccionar
      </button>
    </div>
  );
}
