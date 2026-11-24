"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";

import styles from "./BookmarkletLink.module.css";

type BookmarkletLinkProps = Readonly<{
  /** El `javascript:…` del marcador. */
  code: string;
  label: string;
  /** Lo que se dice si se toca acá en vez de arrastrarlo: el marcador se usa desde IGN. */
  dragHint: string;
}>;

/**
 * React 19 no deja poner un `javascript:` en `href`: se pone desde un efecto, después de montar (design.md §17).
 * Se puede arrastrar a la barra de favoritos, pero no seguir dentro de Ludoteca.
 */
export function BookmarkletLink({ code, label, dragHint }: BookmarkletLinkProps) {
  const link = useRef<HTMLAnchorElement>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    link.current?.setAttribute("href", code);
  }, [code]);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setHint(dragHint);
  }

  return (
    <>
      <a ref={link} className={styles.bookmarklet} draggable onClick={onClick}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 3h12v18l-6-4-6 4z" />
        </svg>
        {label}
      </a>
      <p role="status" className={hint ? styles.hint : styles.empty}>
        {hint}
      </p>
    </>
  );
}
