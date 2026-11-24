import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GameFacts } from "@/components/game/GameFacts";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { buildGame } from "./game-fixtures";

const SIXTY_SECONDS = buildGame({ title: "60 Seconds!", hltbHours: 2.3 });

describe("duración de HowLongToBeat en la ficha", () => {
  it.each([
    ["es", "unas 2.3 h · HowLongToBeat"],
    ["en", "about 2.3 h · HowLongToBeat"],
  ] as const)("Duración de respaldo (%s)", (locale, text) => {
    const game = SIXTY_SECONDS;

    renderWithIntl(<GameFacts game={game} onEdit={vi.fn()} />, { locale });

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("la duración de IGDB sigue ganando sobre la de HowLongToBeat", () => {
    const game = buildGame({ hltbHours: 2.3, catalog: { estimatedHours: 3, endless: false, coverUrl: null } });

    renderWithIntl(<GameFacts game={game} onEdit={vi.fn()} />);

    expect(screen.getByText("unas 3 h · IGDB")).toBeInTheDocument();
  });
});
