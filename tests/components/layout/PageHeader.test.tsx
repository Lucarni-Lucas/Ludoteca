import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/layout/PageHeader";

describe("PageHeader", () => {
  it("muestra el título y un acceso a Ajustes con la inicial del usuario", () => {
    const initial = "L";

    render(<PageHeader title="Tiendas" avatarInitial={initial} />);

    expect(screen.getByRole("heading", { level: 1, name: "Tiendas" })).toBeInTheDocument();
    const avatar = screen.getByRole("link", { name: "Ajustes" });
    expect(avatar).toHaveAttribute("href", "/settings");
    expect(avatar).toHaveTextContent(initial);
  });

  it("marca el avatar cuando el usuario está en Ajustes", () => {
    const settingsActive = true;

    render(<PageHeader title="Ajustes" avatarInitial="L" settingsActive={settingsActive} />);

    expect(screen.getByRole("link", { name: "Ajustes" })).toHaveAttribute("aria-current", "page");
  });

  it("incluye los dos títulos cuando el diseño usa uno distinto en pantallas anchas", () => {
    const wideTitle = "Tu biblioteca";

    render(<PageHeader title="Biblioteca" wideTitle={wideTitle} avatarInitial="L" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("BibliotecaTu biblioteca");
  });

  it("muestra las acciones que recibe", () => {
    const action = <button type="button">Filtros</button>;

    render(<PageHeader title="Biblioteca" avatarInitial="L" actions={action} />);

    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
  });
});
