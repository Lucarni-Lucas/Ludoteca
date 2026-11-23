import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { EMAIL_NOT_ALLOWED_CODE } from "@/model/account/errors";
import { classifySignInError, SIGN_IN_ERROR_NOT_ALLOWED } from "@/model/account/sign-in-error";

import { LoginScreen } from "./login-screen";
import styles from "./page.module.css";

const SIGN_IN_FAILED_CODE = "SIGN_IN_FAILED";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");

  return { title: t("pageTitle") };
}

// Un parámetro repetido llega como lista: se ignora en lugar de romper la pantalla de ingreso.
const optionalParam = z.string().optional().catch(undefined);

const loginParamsSchema = z.object({
  next: optionalParam,
  error: optionalParam,
  error_description: optionalParam,
});

type LoginPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error, error_description: errorDescription } = loginParamsSchema.parse(await searchParams);
  const t = await getTranslations("errors");
  // Lo que llega por la URL nunca se muestra: se clasifica y se muestra el texto propio de ese código.
  const code = classifySignInError({ error, errorDescription });
  const errorCode = code === SIGN_IN_ERROR_NOT_ALLOWED ? EMAIL_NOT_ALLOWED_CODE : SIGN_IN_FAILED_CODE;

  return (
    <main className={styles.page}>
      <LoginScreen next={next} initialErrorMessage={code ? t(errorCode) : null} />
    </main>
  );
}
