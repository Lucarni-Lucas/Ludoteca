import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BottomNav } from "@/components/layout/BottomNav";

describe("BottomNav", () => {
  it("muestra las cuatro secciones en orden", () => {
    const activeSection = "library";

    render(<BottomNav activeSection={activeSection} />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Biblioteca",
      "¿Lo tengo?",
      "Suscripciones",
      "Tiendas",
    ]);
  });

  it("marca solo la sección actual", () => {
    const activeSection = "subscriptions";

    render(<BottomNav activeSection={activeSection} />);

    expect(screen.getByRole("link", { name: "Suscripciones" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tiendas" })).not.toHaveAttribute("aria-current");
  });

  it("no muestra la opción Estadísticas", () => {
    const activeSection = "library";

    render(<BottomNav activeSection={activeSection} />);

    expect(screen.queryByRole("link", { name: "Estadísticas" })).not.toBeInTheDocument();
  });
});
