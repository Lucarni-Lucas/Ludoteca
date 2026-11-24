import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toast, TOAST_DURATION_MS } from "@/components/ui/Toast";
import { useToast } from "@/hooks/use-toast";

/** Una pantalla mínima con su aviso: `show` queda afuera para dispararlo desde el test. */
function Screen({ onReady }: Readonly<{ onReady: (show: (text: string) => void) => void }>) {
  const toast = useToast();

  useEffect(() => {
    onReady(toast.show);
  }, [onReady, toast.show]);

  return (
    <>
      <button type="button">Fila siguiente</button>
      <Toast message={toast.message} onExpire={toast.clear} />
    </>
  );
}

function renderScreen() {
  const screenToast: { show?: (text: string) => void } = {};
  render(<Screen onReady={(value) => (screenToast.show = value)} />);
  return (text: string) => act(() => screenToast.show?.(text));
}

describe("Toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aparece con el texto del aviso", () => {
    const show = renderScreen();

    show("«Beholder» pasó a «Listos para importar» con «Sin interés».");

    expect(screen.getByRole("status")).toHaveTextContent("«Beholder» pasó a «Listos para importar» con «Sin interés».");
  });

  it("se va solo a los 6 segundos", () => {
    const show = renderScreen();
    show("«Beholder» volvió a «¿Lo vas a jugar alguna vez?».");

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));

    expect(TOAST_DURATION_MS).toBe(6000);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("el siguiente reemplaza al que está a la vista y vuelve a contar el tiempo", () => {
    const show = renderScreen();
    show("Primero");
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1000));

    show("Segundo");
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1000));

    expect(screen.getByRole("status")).toHaveTextContent("Segundo");
    expect(screen.getByRole("status")).not.toHaveTextContent("Primero");
  });

  it("no se lleva el foco", () => {
    const show = renderScreen();
    const row = screen.getByRole("button", { name: "Fila siguiente" });
    row.focus();

    show("«Portal 2» pasó a «Listos para importar» con «Familia».");

    expect(row).toHaveFocus();
    expect(screen.getByRole("status").querySelector("button, a, [tabindex]")).toBeNull();
  });
});
