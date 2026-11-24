import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsNav } from "@/components/account/SettingsNav";

import { renderWithIntl } from "../../i18n/render-with-intl";

describe("SettingsNav", () => {
  it("ofrece Cuenta, marcada como actual, e Importar", () => {
    const names = ["Cuenta", "Importar"];

    renderWithIntl(<SettingsNav />);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual(names);
    expect(screen.getByRole("link", { name: "Cuenta" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Importar" })).toHaveAttribute("href", "/import");
    expect(screen.getByRole("link", { name: "Importar" })).not.toHaveAttribute("aria-current");
  });
});
