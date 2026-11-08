import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountPanel } from "@/components/account/AccountPanel";

const email = "lucas@example.com";

describe("AccountPanel", () => {
  it("muestra el mail de la cuenta", () => {
    const accountEmail = email;

    render(<AccountPanel email={accountEmail} pending={false} errorMessage={null} onSignOut={vi.fn()} />);

    expect(screen.getByText(accountEmail)).toBeInTheDocument();
  });

  it("llama a onSignOut cuando el usuario toca «Cerrar sesión»", async () => {
    const onSignOut = vi.fn();
    render(<AccountPanel email={email} pending={false} errorMessage={null} onSignOut={onSignOut} />);

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("deshabilita el botón mientras se cierra la sesión", () => {
    const pending = true;

    render(<AccountPanel email={email} pending={pending} errorMessage={null} onSignOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();
  });

  it("anuncia el error cuando no se pudo cerrar la sesión", () => {
    const errorMessage = "No pudimos cerrar la sesión. Probá de nuevo.";

    render(<AccountPanel email={email} pending={false} errorMessage={errorMessage} onSignOut={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(errorMessage);
  });
});
