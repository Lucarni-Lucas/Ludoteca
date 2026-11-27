import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GameCard } from "@/components/game/GameCard";
import { GameFacts } from "@/components/game/GameFacts";
import { MobileFilters } from "@/components/library/MobileFilters";
import { NO_FILTERS } from "@/model/game/filters";
import { countLibraryOptions } from "@/model/game/summary";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { buildGame } from "./game-fixtures";

const NO_CORRECTIONS = { estimatedHours: null, endless: null, coverUrl: null };

describe("duración en los dos idiomas", () => {
  it.each([
    { name: "horas del catálogo en español", locale: "es", catalog: { estimatedHours: 22, endless: false }, expected: "unas 22 h · IGDB" },
    { name: "horas del catálogo en inglés", locale: "en", catalog: { estimatedHours: 12.5, endless: false }, expected: "about 12.5 h · IGDB" },
    { name: "sin fin en inglés", locale: "en", catalog: { estimatedHours: null, endless: true }, expected: "Endless" },
    { name: "desconocida en inglés", locale: "en", catalog: { estimatedHours: null, endless: false }, expected: "Unknown length" },
  ] as const)("$name", ({ locale, catalog, expected }) => {
    const game = buildGame({ catalog: { ...catalog, coverUrl: null }, corrections: NO_CORRECTIONS });

    renderWithIntl(<GameFacts game={game} onEdit={vi.fn()} />, { locale });

    expect(screen.getByText(expected, { exact: false })).toBeInTheDocument();
  });

  it("la duración corregida dice «yours» en inglés", () => {
    const game = buildGame({ corrections: { ...NO_CORRECTIONS, estimatedHours: 30 } });

    renderWithIntl(<GameFacts game={game} onEdit={vi.fn()} />, { locale: "en" });

    expect(screen.getByText("about 30 h · yours", { exact: false })).toBeInTheDocument();
  });
});

describe("cantidad de juegos de los filtros del celu", () => {
  it.each([
    { locale: "es", count: 1, expected: "Ver 1 juego" },
    { locale: "es", count: 5, expected: "Ver 5 juegos" },
    { locale: "es", count: 0, expected: "Ver 0 juegos" },
    { locale: "en", count: 1, expected: "See 1 game" },
    { locale: "en", count: 5, expected: "See 5 games" },
  ] as const)("$count en $locale da «$expected»", ({ locale, count, expected }) => {
    const panel = { filters: NO_FILTERS, counts: countLibraryOptions([], "exclude"), stores: [], onChange: vi.fn() };

    renderWithIntl(
      <MobileFilters {...panel} open onOpenChange={vi.fn()} groups={[]} resultCount={count} onClear={vi.fn()} />,
      { locale },
    );

    expect(screen.getByRole("button", { name: expected })).toBeInTheDocument();
  });
});

describe("Título del catálogo", () => {
  it.each(["es", "en"] as const)("se ve sin traducir en %s", (locale) => {
    const game = buildGame({ title: "The Witcher 3: Wild Hunt", developer: "CD Projekt Red" });

    renderWithIntl(<GameCard game={game} />, { locale });

    expect(screen.getByText("The Witcher 3: Wild Hunt")).toBeInTheDocument();
  });
});
