import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginCard } from "@/components/account/LoginCard";

describe("LoginCard", () => {
  it("llama a onSignIn cuando el usuario toca «Ingresar con Google»", async () => {
    const onSignIn = vi.fn();
    render(<LoginCard pending={false} errorMessage={null} onSignIn={onSignIn} />);

    await userEvent.click(screen.getByRole("button", { name: "Ingresar con Google" }));

    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it("deshabilita el botón y avisa mientras está pendiente", () => {
    const pending = true;

    render(<LoginCard pending={pending} errorMessage={null} onSignIn={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Ingresando…" })).toBeDisabled();
  });

  it("no acepta otro toque mientras está pendiente", async () => {
    const onSignIn = vi.fn();
    render(<LoginCard pending errorMessage={null} onSignIn={onSignIn} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onSignIn).not.toHaveBeenCalled();
  });

  it("anuncia el mensaje de error", () => {
    const errorMessage = "Esta cuenta no tiene acceso a Ludoteca";

    render(<LoginCard pending={false} errorMessage={errorMessage} onSignIn={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(errorMessage);
  });

  it("no muestra ninguna alerta cuando no hay error", () => {
    const errorMessage = null;

    render(<LoginCard pending={false} errorMessage={errorMessage} onSignIn={vi.fn()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
