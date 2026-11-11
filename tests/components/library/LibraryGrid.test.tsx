import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LibraryEmpty } from "@/components/library/LibraryEmpty";
import { LibraryGrid } from "@/components/library/LibraryGrid";

import { buildGame } from "../game/game-fixtures";

describe("LibraryGrid", () => {
  it("muestra una tarjeta por juego", () => {
    const games = [buildGame({ id: "a", title: "Hades" }), buildGame({ id: "b", title: "Celeste" })];

    render(<LibraryGrid games={games} />);

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("Celeste")).toBeInTheDocument();
  });
});

describe("LibraryEmpty", () => {
  it("conserva la invitación a agregar el primer juego", () => {
    render(<LibraryEmpty />);

    expect(screen.getByRole("link", { name: "Agregá tu primer juego" })).toHaveAttribute("href", "/add");
  });
});
