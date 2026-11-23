import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import styles from "./AccountPanel.module.css";

type AccountPanelProps = Readonly<{
  email: string;
  pending: boolean;
  errorMessage: string | null;
  onSignOut: () => void;
  /** Los ajustes de la cuenta, arriba de «Cerrar sesión». */
  children?: ReactNode;
}>;

export function AccountPanel({ email, pending, errorMessage, onSignOut, children }: AccountPanelProps) {
  const t = useTranslations("settings");

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{t("account")}</h2>
      <div>
        <p className={styles.caption}>{t("signedInAs")}</p>
        <p className={styles.email}>{email}</p>
      </div>
      {children}
      {errorMessage ? (
        <p role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
      <button type="button" className={styles.button} disabled={pending} aria-busy={pending} onClick={onSignOut}>
        {pending ? t("signingOut") : t("signOut")}
      </button>
    </section>
  );
}
