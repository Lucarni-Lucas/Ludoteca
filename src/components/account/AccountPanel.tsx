import styles from "./AccountPanel.module.css";

type AccountPanelProps = Readonly<{
  email: string;
  pending: boolean;
  errorMessage: string | null;
  onSignOut: () => void;
}>;

export function AccountPanel({ email, pending, errorMessage, onSignOut }: AccountPanelProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Cuenta</h2>
      <div>
        <p className={styles.caption}>Ingresaste como</p>
        <p className={styles.email}>{email}</p>
      </div>
      {errorMessage ? (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
      <button type="button" className={styles.button} disabled={pending} aria-busy={pending} onClick={onSignOut}>
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
    </section>
  );
}
