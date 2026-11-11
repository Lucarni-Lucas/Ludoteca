import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Notice";
import { Toggle } from "@/components/ui/Toggle";

function ModalHarness({ onOpenChange }: Readonly<{ onOpenChange?: (open: boolean) => void }>) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
        title="Cambiar estado"
        description="Disco Elysium"
      >
        <button type="button">Dentro</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("mueve el foco adentro al abrirse", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    const dialog = screen.getByRole("dialog", { name: "Cambiar estado" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("se cierra con Escape y devuelve el foco a quien la abrió", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ModalHarness onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));

    await user.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Abrir" })).toHaveFocus());
  });

  it("se cierra con el botón Cerrar", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "Abrir" }));

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra la descripción", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleDescription("Disco Elysium");
  });
});

describe("Toggle", () => {
  it("avisa el nuevo valor al tocarlo", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Toggle label="Sin fin" checked={false} onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch", { name: "Sin fin" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("refleja el valor recibido", () => {
    const checked = true;

    render(<Toggle label="Sin fin" checked={checked} onCheckedChange={() => undefined} />);

    expect(screen.getByRole("switch", { name: "Sin fin" })).toBeChecked();
  });

  it("no cambia si está deshabilitado", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Toggle label="Sin fin" checked={false} disabled onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole("switch", { name: "Sin fin" }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("Notice", () => {
  it("anuncia el mensaje", () => {
    const message = "Frostpunk pasó a «Pendiente»";

    render(<Notice message={message} />);

    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("queda montado y vacío cuando no hay mensaje", () => {
    const message = null;

    render(<Notice message={message} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
