"use client";

import { LoadError } from "@/components/layout/LoadError";

type AppErrorProps = Readonly<{
  error: unknown;
  retry: () => void;
}>;

/**
 * En producción Next no deja ver al navegador qué error fue, así que el aviso es el mismo para todos.
 * El caso esperado es la base que no respondió: `retry` vuelve a pedir los datos del segmento.
 */
export default function AppError({ retry }: AppErrorProps) {
  return <LoadError onRetry={retry} />;
}
