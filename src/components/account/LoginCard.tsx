import { Logo } from "@/components/layout/Logo";

import styles from "./LoginCard.module.css";

type LoginCardProps = Readonly<{
  pending: boolean;
  errorMessage: string | null;
  onSignIn: () => void;
}>;

export function LoginCard({ pending, errorMessage, onSignIn }: LoginCardProps) {
  return (
    <section className={styles.card}>
      <Logo />
      <h1 className={styles.title}>Ingresá a tu biblioteca</h1>
      <p className={styles.text}>Tus juegos, tus tiendas y tus suscripciones, en un solo lugar.</p>
      {errorMessage ? (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
      <button type="button" className={styles.button} disabled={pending} aria-busy={pending} onClick={onSignIn}>
        {pending ? "Ingresando…" : "Ingresar con Google"}
      </button>
    </section>
  );
}
