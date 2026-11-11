"use client";

import Image from "next/image";
import { type CSSProperties, useState } from "react";

import { coverInitials, coverTone, isDisplayableCover } from "@/model/game/cover";

import styles from "./GameCover.module.css";

// El tamaño real lo define el CSS de cada contexto; el navegador solo necesita la proporción.
const COVER_WIDTH = 264;
const COVER_HEIGHT = 352;

type GameCoverProps = Readonly<{
  title: string;
  coverUrl: string | null;
  year?: number | null;
  variant: "card" | "small" | "form" | "detail";
  dashed?: boolean;
}>;

export function GameCover({ title, coverUrl, year, variant, dashed }: GameCoverProps) {
  // Se guarda la URL que falló y no un booleano: si después cambia la portada, se vuelve a intentar.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const tone = coverTone(title);
  const showImage = isDisplayableCover(coverUrl) && coverUrl !== brokenUrl;
  const style = {
    "--cover-bg": `var(--color-cover-${tone}-bg)`,
    "--cover-fg": `var(--color-cover-${tone}-fg)`,
  } as CSSProperties;

  return (
    <span className={`${styles.cover} ${styles[variant]}`} style={style} data-dashed={dashed ? "true" : undefined}>
      {showImage ? (
        // unoptimized: las imágenes ya vienen del tamaño justo y optimizarlas agotaría el cupo gratis de Vercel.
        <Image
          className={styles.image}
          src={coverUrl}
          alt=""
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          loading="lazy"
          unoptimized
          onError={() => setBrokenUrl(coverUrl)}
        />
      ) : (
        <>
          {year ? <span className={styles.year}>{year}</span> : null}
          <span className={styles.initials} aria-hidden="true">
            {coverInitials(title)}
          </span>
        </>
      )}
    </span>
  );
}
