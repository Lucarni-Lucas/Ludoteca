import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LibraryScreen } from "@/app/(app)/library/library-screen";
import type { LibraryGame } from "@/model/game/library-game";
import { groupStatuses } from "@/model/status/status";

import { buildCopy, buildGame, STATUSES, statusByKey } from "../game/game-fixtures";

const { setNotInterestedAction } = vi.hoisted(() => ({
  setNotInterestedAction: vi.fn(async (): Promise<{ ok: true; data: undefined }> => ({ ok: true, data: undefined })),
}));

vi.mock("@/app/(app)/library/actions", () => ({ setNotInterestedAction }));

function renderScreen(games: readonly LibraryGame[]) {
  render(
    <LibraryScreen games={games} statusGroups={groupStatuses(STATUSES)} avatarInitial="L" initialSearch="" />,
  );
}

const hidden = buildGame({ id: "oculto", title: "8BitMMO", notInterested: true, addedAt: "2026-02-01T00:00:00.000Z" });
const visible = buildGame({ id: "visible", title: "Hades", copies: [buildCopy()] });

describe("LibraryScreen", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/library");
    setNotInterestedAction.mockClear();
  });

  it("muestra la invitación cuando la biblioteca está vacía", () => {
    const games: readonly LibraryGame[] = [];

    renderScreen(games);

    expect(screen.getByRole("link", { name: "Agregá tu primer juego" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("muestra el resumen de la biblioteca", () => {
    const games = [visible];

    renderScreen(games);

    expect(screen.getByText("1 juego en 1 tienda · 0 en «Quiero jugarlo» · 0 que ya no tenés")).toBeInTheDocument();
  });

  it("muestra los juegos, sin los «Sin interés»", () => {
    const games = [visible, hidden];

    renderScreen(games);

    expect(screen.getByText("Hades")).toBeInTheDocument();
    expect(screen.queryByText("8BitMMO")).not.toBeInTheDocument();
  });

  it("Ver los juegos sin interés", async () => {
    const user = userEvent.setup();
    renderScreen([visible, hidden]);

    await user.click(screen.getByRole("switch", { name: "Mostrar sin interés" }));

    expect(screen.getByText("8BitMMO")).toBeInTheDocument();
    expect(screen.getByText("SIN INTERÉS")).toBeInTheDocument();
  });

  it("filtra por título al escribir", async () => {
    const user = userEvent.setup();
    const games = [visible, buildGame({ id: "b", title: "Civilization VI" })];
    renderScreen(games);

    await user.type(screen.getByRole("textbox", { name: "Buscar por título" }), "civ");

    expect(screen.getByText("Civilization VI")).toBeInTheDocument();
    expect(screen.queryByText("Hades")).not.toBeInTheDocument();
  });

  it("ofrece limpiar cuando ningún juego cumple", async () => {
    const user = userEvent.setup();
    renderScreen([visible]);
    await user.type(screen.getByRole("textbox", { name: "Buscar por título" }), "zzz");

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByText("Hades")).toBeInTheDocument();
  });

  it("marca varios juegos como «Sin interés» desde la selección", async () => {
    const user = userEvent.setup();
    const other = buildGame({ id: "otro", title: "Celeste", status: statusByKey("playing") });
    renderScreen([visible, other]);

    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar Hades" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar Celeste" }));
    await user.click(screen.getByRole("button", { name: "Marcar sin interés" }));

    expect(setNotInterestedAction).toHaveBeenCalledWith(["visible", "otro"], true);
  });

  it("desmarca cuando todo lo elegido ya está oculto", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/library?hidden=1");
    renderScreen([visible, hidden]);

    await user.click(screen.getByRole("button", { name: "Seleccionar" }));
    await user.click(screen.getByRole("button", { name: "Seleccionar 8BitMMO" }));
    await user.click(screen.getByRole("button", { name: "Quitar «Sin interés»" }));

    expect(setNotInterestedAction).toHaveBeenCalledWith(["oculto"], false);
  });
});
