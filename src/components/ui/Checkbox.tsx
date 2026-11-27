import styles from "./Checkbox.module.css";

type CheckboxProps = Readonly<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}>;

/** Una casilla nativa con su texto: toda la fila es la zona táctil de 44 px. */
export function Checkbox({ label, checked, disabled = false, onCheckedChange }: CheckboxProps) {
  return (
    <label className={styles.row}>
      <input
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
