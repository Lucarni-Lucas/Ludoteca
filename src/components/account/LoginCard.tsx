import { useTranslations } from "next-intl";

import { Logo } from "@/components/layout/Logo";

import styles from "./LoginCard.module.css";

type LoginCardProps = Readonly<{
  pending: boolean;
  errorMessage: string | null;
  onSignIn: () => void;
}>;

export function LoginCard({ pending, errorMessage, onSignIn }: LoginCardProps) {
  const t = useTranslations("login");

  return (
    <section className={styles.card}>
      <Logo />
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.text}>{t("text")}</p>
      {errorMessage ? (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
      <button type="button" className={styles.button} disabled={pending} aria-busy={pending} onClick={onSignIn}>
        {pending ? t("signingIn") : t("signIn")}
      </button>
    </section>
  );
}
