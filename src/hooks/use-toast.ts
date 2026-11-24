"use client";

import { useCallback, useRef, useState } from "react";

import type { ToastMessage } from "@/components/ui/Toast";

/** El aviso flotante de una pantalla: el siguiente reemplaza al que está a la vista. */
export function useToast() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const show = useCallback((text: string) => {
    nextId.current += 1;
    setMessage({ id: nextId.current, text });
  }, []);

  const clear = useCallback(() => setMessage(null), []);

  return { message, show, clear };
}
