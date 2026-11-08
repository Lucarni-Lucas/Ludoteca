import type { Metadata } from "next";
import { z } from "zod";

import { signInErrorMessage } from "@/model/account/sign-in-error";

import { LoginScreen } from "./login-screen";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Ingresar · Ludoteca",
};

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

  return (
    <main className={styles.page}>
      <LoginScreen next={next} initialErrorMessage={signInErrorMessage({ error, errorDescription })} />
    </main>
  );
}
