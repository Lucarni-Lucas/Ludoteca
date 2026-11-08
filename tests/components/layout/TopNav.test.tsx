import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TopNav } from "@/components/layout/TopNav";

describe("TopNav", () => {
  function renderNav(activeSection: Parameters<typeof TopNav>[0]["activeSection"] = "stores") {
    render(<TopNav activeSection={activeSection} avatarInitial="L" settingsActive={false} />);
  }

  it("marca solo la sección actual", () => {
    const activeSection = "stores";

    renderNav(activeSection);

    expect(screen.getByRole("link", { name: "Tiendas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Biblioteca" })).not.toHaveAttribute("aria-current");
  });

  it("no marca ninguna sección cuando la pantalla no es una de ellas", () => {
    const activeSection = null;

    renderNav(activeSection);

    expect(screen.getByRole("navigation", { name: "Principal" }).querySelector("[aria-current]")).toBeNull();
  });

  it("no muestra la opción Estadísticas", () => {
    const activeSection = "library";

    renderNav(activeSection);

    expect(screen.queryByRole("link", { name: "Estadísticas" })).not.toBeInTheDocument();
  });

  it("muestra «Agregar juego» y el acceso a Ajustes con la inicial", () => {
    const activeSection = "library";

    renderNav(activeSection);

    expect(screen.getByRole("link", { name: "Agregar juego" })).toHaveAttribute("href", "/add");
    expect(screen.getByRole("link", { name: "Ajustes" })).toHaveTextContent("L");
  });

  it("busca en ¿Lo tengo? con un formulario que no necesita JavaScript", () => {
    const activeSection = "library";

    renderNav(activeSection);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/check");
    expect(form).toHaveAttribute("method", "get");
    expect(screen.getByRole("searchbox", { name: "Buscar en tu biblioteca" })).toHaveAttribute("name", "q");
  });
});
