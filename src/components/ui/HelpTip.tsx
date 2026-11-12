"use client";

import { useId, useState } from "react";

import type { HelpText } from "./help-texts";
import styles from "./HelpTip.module.css";

type HelpTipProps = Readonly<{ help: HelpText }>;

/** Marca la ayuda abierta, para que una ventana emergente cierre primero la ayuda con Escape (ver Modal). */
export const OPEN_HELP_SELECTOR = '[data-help-open="true"]';

/**
 * Un «?» con el popover nativo: se cierra solo con Escape, tocando afuera o tocando otra vez el «?».
 * El foco no entra al popover, así que al cerrarlo sigue en el «?».
 */
export function HelpTip({ help }: HelpTipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} popoverTarget={id} aria-label={`Qué es «${help.term}»`}>
        <span className={styles.mark} aria-hidden="true">
          ?
        </span>
      </button>
      <div
        id={id}
        popover="auto"
        className={styles.popover}
        data-help-open={open}
        onToggle={(event) => setOpen(event.newState === "open")}
      >
        {help.text}
      </div>
    </>
  );
}
