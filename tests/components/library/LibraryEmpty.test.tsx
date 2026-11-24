import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibraryEmpty } from "@/components/library/LibraryEmpty";

import { renderWithIntl } from "../../i18n/render-with-intl";

describe("LibraryEmpty", () => {
  it("Biblioteca vacía", () => {
    const locale = "es";

    renderWithIntl(<LibraryEmpty />, { locale });

    expect(screen.getByText("Todavía no cargaste ningún juego.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agregá tu primer juego" })).toHaveAttribute("href", "/add");
    expect(screen.getByRole("link", { name: "Importar tu biblioteca" })).toHaveAttribute("href", "/import");
  });

  it("ofrece las dos acciones también en inglés", () => {
    const locale = "en";

    renderWithIntl(<LibraryEmpty />, { locale });

    expect(screen.getByRole("link", { name: "Add a game" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Import your library" })).toBeInTheDocument();
  });
});
