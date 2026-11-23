import { screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { describe, expect, it } from "vitest";

import { renderHookWithIntl, renderWithIntl } from "./render-with-intl";

function Description() {
  const t = useTranslations("common");
  return <p>{t("description")}</p>;
}

describe("renderWithIntl", () => {
  it("renderiza en español si no se pide otro idioma", () => {
    const ui = <Description />;

    renderWithIntl(ui);

    expect(screen.getByText("Tu biblioteca de videojuegos, tus tiendas y tus suscripciones.")).toBeInTheDocument();
  });

  it("renderiza la misma clave en inglés", () => {
    const ui = <Description />;

    renderWithIntl(ui, { locale: "en" });

    expect(screen.getByText("Your video game library, your stores and your subscriptions.")).toBeInTheDocument();
  });
});

describe("renderHookWithIntl", () => {
  it("da a los hooks el catálogo del idioma pedido", () => {
    const useDescription = () => useTranslations("common")("description");

    const { result } = renderHookWithIntl(useDescription, { locale: "en" });

    expect(result.current).toBe("Your video game library, your stores and your subscriptions.");
  });
});
