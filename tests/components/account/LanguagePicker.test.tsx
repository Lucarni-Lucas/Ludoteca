import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguagePicker } from "@/components/account/LanguagePicker";

import { renderWithIntl } from "../../i18n/render-with-intl";

describe("LanguagePicker", () => {
  it("Pasar a inglés", async () => {
    const onChoose = vi.fn();
    renderWithIntl(<LanguagePicker value="es" pending={false} change={null} onChoose={onChoose} />);

    await userEvent.click(screen.getByRole("button", { name: "English" }));

    expect(onChoose).toHaveBeenCalledWith("en");
  });

  it("Volver al español", async () => {
    const onChoose = vi.fn();
    renderWithIntl(<LanguagePicker value="en" pending={false} change={null} onChoose={onChoose} />, { locale: "en" });

    await userEvent.click(screen.getByRole("button", { name: "Español" }));

    expect(onChoose).toHaveBeenCalledWith("es");
  });

  it("marca el idioma actual y escribe cada opción en su idioma", () => {
    const value = "es";

    renderWithIntl(<LanguagePicker value={value} pending={false} change={null} onChoose={vi.fn()} />);

    const group = screen.getByRole("group", { name: "Idioma" });
    expect(screen.getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en");
    expect(group).toContainElement(screen.getByRole("button", { name: "Español" }));
  });

  it.each([
    { name: "avisa «Idioma actualizado» en español", locale: "es", change: "updated", expected: "Idioma actualizado" },
    { name: "avisa «Language updated» en inglés", locale: "en", change: "updated", expected: "Language updated" },
    { name: "avisa que ya estaba en español", locale: "es", change: "unchanged", expected: "Ya estaba en español" },
    { name: "avisa que ya estaba en inglés", locale: "en", change: "unchanged", expected: "Already in English" },
  ] as const)("$name", ({ locale, change, expected }) => {
    const ui = <LanguagePicker value={locale} pending={false} change={change} onChoose={vi.fn()} />;

    renderWithIntl(ui, { locale });

    expect(screen.getByRole("status")).toHaveTextContent(expected);
  });

  it("no deja elegir otra vez mientras guarda", () => {
    const pending = true;

    renderWithIntl(<LanguagePicker value="es" pending={pending} change={null} onChoose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "English" })).toBeDisabled();
  });
});
