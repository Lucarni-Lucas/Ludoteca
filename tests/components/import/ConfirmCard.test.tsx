import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmCard } from "@/components/import/ConfirmCard";

import { renderWithIntl } from "../../i18n/render-with-intl";

const READY = { games: 237, copies: 252 };

describe("ConfirmCard", () => {
  it("dice lo que está en «Listos para importar» y confirma", async () => {
    const onConfirm = vi.fn();
    renderWithIntl(<ConfirmCard ready={READY} confirming={false} summary={null} errorMessage={null} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirmar importación" }));

    expect(screen.getByText(/En «Listos para importar»:/)).toHaveTextContent("En «Listos para importar»: 237 juegos y 252 copias");
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("con un juego y una copia lo dice en singular", () => {
    const ready = { games: 1, copies: 1 };

    renderWithIntl(<ConfirmCard ready={ready} confirming={false} summary={null} errorMessage={null} onConfirm={vi.fn()} />);

    expect(screen.getByText(/En «Listos para importar»:/)).toHaveTextContent("En «Listos para importar»: 1 juego y 1 copia");
  });

  it("con «Listos para importar» vacío el botón está deshabilitado y lo dice", () => {
    const ready = { games: 0, copies: 0 };

    renderWithIntl(<ConfirmCard ready={ready} confirming={false} summary={null} errorMessage={null} onConfirm={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Confirmar importación" })).toBeDisabled();
    expect(screen.getByText("Todavía no hay nada en «Listos para importar» para confirmar.")).toBeInTheDocument();
  });

  it.each([
    ["es", { games: 480, copies: 520, hidden: 60, excluded: 4 }, "Entraron 480 juegos y 520 copias · 60 ocultos · 4 sin importar"],
    ["es", { games: 1, copies: 1, hidden: 1, excluded: 0 }, "Entraron 1 juego y 1 copia · 1 oculto · 0 sin importar"],
    ["en", { games: 480, copies: 520, hidden: 60, excluded: 4 }, "480 games and 520 copies came in · 60 hidden · 4 not imported"],
    ["en", { games: 1, copies: 1, hidden: 1, excluded: 0 }, "1 game and 1 copy came in · 1 hidden · 0 not imported"],
  ] as const)("Resumen final en %s: %j", (locale, summary, text) => {
    const ready = { games: 0, copies: 0 };

    renderWithIntl(<ConfirmCard ready={ready} confirming={false} summary={summary} errorMessage={null} onConfirm={vi.fn()} />, { locale });

    expect(screen.getByRole("status")).toHaveTextContent(text);
  });
});
