import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CopyChips } from "@/components/copy/CopyChips";
import { CopyList } from "@/components/copy/CopyList";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { buildCopy } from "../game/game-fixtures";

const handlers = { onAdd: vi.fn(), onMarkLost: vi.fn(), onRecover: vi.fn(), onRemove: vi.fn() };

describe("textos de las copias", () => {
  it.each([
    { locale: "es", expected: "Otro · Regalo" },
    { locale: "en", expected: "Other · Regalo" },
  ] as const)("Detalle de una copia ($locale)", ({ locale, expected }) => {
    const gift = buildCopy({ kind: "other", kindDetail: "Regalo" });

    renderWithIntl(<CopyList copies={[gift]} {...handlers} />, { locale });

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each(["es", "en"] as const)("Tienda propia (%s)", (locale) => {
    const own = buildCopy({ storeId: "humble", storeName: "Humble Store" });

    renderWithIntl(<CopyChips copies={[own]} notBought={false} />, { locale });

    expect(screen.getByText("Humble Store")).toBeInTheDocument();
  });

  it.each([
    { name: "una copia de la familia dice de quién es en inglés", copy: { kind: "family", familyOwner: "Ana" }, expected: "Family · from Ana" },
    { name: "una copia perdida dice que ya no la tenés en inglés", copy: { kind: "physical", lostAt: "2026-01-01", lostReason: "sold" }, expected: "Physical · no longer" },
  ] as const)("$name", ({ copy, expected }) => {
    const value = buildCopy(copy);

    renderWithIntl(<CopyList copies={[value]} {...handlers} />, { locale: "en" });

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("la tarjeta muestra el tipo en el idioma elegido y la tienda tal cual", () => {
    const subscription = buildCopy({ storeName: "Game Pass", kind: "subscription" });

    renderWithIntl(<CopyChips copies={[subscription]} notBought={false} />, { locale: "en" });

    expect(screen.getByText("Game Pass · Subscription")).toBeInTheDocument();
  });
});
