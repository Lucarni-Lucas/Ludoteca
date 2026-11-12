"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode, useRef } from "react";

import { OPEN_HELP_SELECTOR } from "./HelpTip";
import { CloseIcon } from "./icons";
import styles from "./Modal.module.css";

const CLOSE_ICON_SIZE = 20;

type ModalProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** A pantalla completa en el celu, como los filtros. */
  fullScreen?: boolean;
  /** Más ancha en PC, para contenido en dos columnas. */
  wide?: boolean;
  /** Acción extra del encabezado, a la derecha del título. */
  headerAction?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}>;

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  fullScreen,
  wide,
  headerAction,
  footer,
  children,
}: ModalProps) {
  // Radix solo devuelve el foco a un Dialog.Trigger, y estas ventanas se abren desde afuera.
  const opener = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);

  // Radix escucha Escape en todo el documento: con una ayuda «?» abierta, Escape cierra solo la ayuda.
  function closeOpenHelp(event: KeyboardEvent): void {
    const help = content.current?.querySelector<HTMLElement>(OPEN_HELP_SELECTOR);

    if (help) {
      event.preventDefault();
      help.hidePopover();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          ref={content}
          onEscapeKeyDown={closeOpenHelp}
          className={`${styles.content} ${fullScreen ? styles.fullScreen : ""} ${wide ? styles.wide : ""}`}
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          // Sin descripción, Radix avisa por consola: se le indica que es a propósito.
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className={styles.header}>
            <div className={styles.headings}>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              {description ? <Dialog.Description className={styles.description}>{description}</Dialog.Description> : null}
            </div>
            {headerAction}
            <Dialog.Close className={styles.close} aria-label="Cerrar">
              <CloseIcon size={CLOSE_ICON_SIZE} />
            </Dialog.Close>
          </div>
          <div className={styles.body}>{children}</div>
          {footer ? <div className={styles.footer}>{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
