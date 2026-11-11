import styles from "./Notice.module.css";

/** Queda montado aunque esté vacío: un `role="status"` que aparece junto con su texto no siempre se anuncia. */
export function Notice({ message }: Readonly<{ message: string | null }>) {
  return (
    <p role="status" className={message ? styles.notice : styles.empty}>
      {message}
    </p>
  );
}
