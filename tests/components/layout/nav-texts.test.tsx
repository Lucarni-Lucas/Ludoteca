import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TopNav } from "@/components/layout/TopNav";
import { LibraryEmpty } from "@/components/library/LibraryEmpty";

import { renderWithIntl } from "../../i18n/render-with-intl";

describe("textos de la navegación", () => {
  it("Botón en inglés", () => {
    const locale = "en";

    renderWithIntl(<TopNav activeSection="library" avatarInitial="L" settingsActive={false} />, { locale });

    expect(screen.getByRole("link", { name: "Add game" })).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("link", { name: "Agregar juego" })).not.toBeInTheDocument();
  });

  it("muestra las secciones en inglés", () => {
    const locale = "en";

    renderWithIntl(<TopNav activeSection="library" avatarInitial="L" settingsActive={false} />, { locale });

    const names = ["Library", "Do I have it?", "Subscriptions", "Stores"];
    expect(names.map((name) => screen.getByRole("link", { name }))).toHaveLength(names.length);
  });

  it("Llamado a la acción", () => {
    const locale = "es";

    renderWithIntl(<LibraryEmpty />, { locale });

    expect(screen.getByRole("link", { name: /^Agregá/ })).toHaveAttribute("href", "/add");
  });

  it("Llamado a la acción en inglés", () => {
    const locale = "en";

    renderWithIntl(<LibraryEmpty />, { locale });

    expect(screen.getByRole("link", { name: "Add a game" })).toHaveAttribute("href", "/add");
  });
});
