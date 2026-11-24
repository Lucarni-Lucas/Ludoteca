"use client";

import { useEffect } from "react";

import styles from "./Toast.module.css";

/** Lo que dura a la vista un aviso flotante, si antes no llega otro (design.md §15). */
export const TOAST_DURATION_MS = 6000;

/** Cada aviso tiene su id: el mismo texto dos veces seguidas vuelve a contar los 6 s. */
export type ToastMessage = Readonly<{ id: number; text: string }>;

type ToastProps = Readonly<{ message: ToastMessage | null; onExpire: () => void }>;

/**
 * Fijo abajo, encima de la barra de secciones en el celu, para que se vea aunque la fila ya no esté.
 * No se lleva el foco. Queda montado vacío: un `role="status"` que aparece con su texto no siempre se anuncia.
 */
export function Toast({ message, onExpire }: ToastProps) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = setTimeout(onExpire, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, onExpire]);

  return (
    <div role="status" className={message ? styles.toast : styles.empty}>
      {message ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m5 12 5 5 9-10" />
          </svg>
          <span>{message.text}</span>
        </>
      ) : null}
    </div>
  );
}
