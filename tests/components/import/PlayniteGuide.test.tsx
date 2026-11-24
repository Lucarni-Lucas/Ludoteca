import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PLAYNITE_EXPORTER_URL, PlayniteGuide } from "@/components/import/PlayniteGuide";

import { renderWithIntl } from "../../i18n/render-with-intl";

describe("PlayniteGuide", () => {
  it("Abrir la guía de Playnite", () => {
    renderWithIntl(<PlayniteGuide />);

    const link = screen.getByRole("link", { name: "la página de su autor" });
    const steps = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(screen.getByRole("heading", { level: 1, name: "¿Cómo saco mi biblioteca de Playnite?" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Playnite es un programa gratis para Windows que junta tus juegos de Epic, GOG, Steam y otras tiendas. Dejá Steam sin iniciar sesión: así lista lo que tenés instalado.",
      ),
    ).toBeInTheDocument();
    expect(link).toHaveAttribute("href", PLAYNITE_EXPORTER_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(steps.map((step) => step.textContent)).toEqual([
      "1Bajá el exportador PlayniteLibraryExport desde la página de su autor y abrí el archivo .pext con Playnite cerrado.",
      "2En Playnite: Extensions › Playnite Library Exporter › Export library now, en JSON.",
      "3Volvé a Importar y subí el archivo en Playnite.",
    ]);
  });

  it("no explica cómo instalar Playnite ni cómo conectar las tiendas", () => {
    renderWithIntl(<PlayniteGuide />);

    const text = document.body.textContent ?? "";

    expect(text).not.toMatch(/instal(á|ar) Playnite|conect(á|ar) (Epic|GOG)/i);
  });

  it("se ve en inglés", () => {
    renderWithIntl(<PlayniteGuide />, { locale: "en" });

    const title = screen.getByRole("heading", { level: 1 });

    expect(title).toHaveTextContent("How do I get my Playnite library?");
    expect(screen.getByRole("link", { name: "its author’s page" })).toHaveAttribute("href", PLAYNITE_EXPORTER_URL);
  });
});
