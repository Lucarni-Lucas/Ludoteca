import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GameScreen } from "@/app/(app)/games/[id]/game-screen";
import { CopyList } from "@/components/copy/CopyList";
import { StatusCard } from "@/components/status/StatusCard";
import { GameFacts } from "@/components/game/GameFacts";
import type { LibraryGame } from "@/model/game/library-game";
import { groupStatuses } from "@/model/status/status";

import { buildCopy, buildGame, STATUSES, statusByKey } from "./game-fixtures";

const OK = { ok: true as const, data: undefined };
const FAILURE = (message: string) => ({ ok: false as const, error: { code: "X", message } });

const actions = vi.hoisted(() => ({
  changeStatusAction: vi.fn(),
  setScoreAction: vi.fn(),
  addCopyAction: vi.fn(),
  markCopyLostAction: vi.fn(),
  recoverCopyAction: vi.fn(),
  removeCopyAction: vi.fn(),
  updateCorrectionsAction: vi.fn(),
  refreshFromIgdbAction: vi.fn(),
  linkToIgdbAction: vi.fn(),
  setGameNotInterestedAction: vi.fn(),
  removeFromLibraryAction: vi.fn(),
}));

vi.mock("@/app/(app)/games/[id]/actions", () => actions);
vi.mock("@/app/(app)/add/actions", () => ({ uploadCoverAction: vi.fn() }));

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

const GROUPS = groupStatuses(STATUSES);
const STORES = [{ id: "steam", name: "Steam", slug: "steam" }];

function renderScreen(game: LibraryGame, openCopyDialog = false) {
  render(<GameScreen game={game} statusGroups={GROUPS} stores={STORES} openCopyDialog={openCopyDialog} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(actions).forEach((action) => action.mockResolvedValue(OK));
});

describe("StatusCard", () => {
  it("Ficha con estado", () => {
    const status = statusByKey("playing");

    render(<StatusCard status={status} statusSince="2026-10-28" onChange={() => undefined} />);

    expect(screen.getByText("Jugando")).toBeInTheDocument();
    expect(screen.getByText("En curso · desde el 28 oct")).toBeInTheDocument();
  });

  it("Terminar un juego", () => {
    const status = statusByKey("completed");

    render(<StatusCard status={status} statusSince="2026-11-06" onChange={() => undefined} />);

    expect(screen.getByText("Terminado · lo terminaste el 6 nov")).toBeInTheDocument();
  });
});

describe("GameFacts", () => {
  it("IGDB sin duración", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const game = buildGame({ catalog: { estimatedHours: null, endless: false, coverUrl: null } });
    render(<GameFacts game={game} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByText(/Duración desconocida/)).toBeInTheDocument();
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("Juego sin fin", () => {
    const game = buildGame({ corrections: { estimatedHours: null, endless: true, coverUrl: null } });

    render(<GameFacts game={game} onEdit={() => undefined} />);

    expect(screen.getByText(/^Sin fin/)).toBeInTheDocument();
  });

  it("muestra la corrección propia", () => {
    const game = buildGame({
      catalog: { estimatedHours: 22, endless: false, coverUrl: null },
      corrections: { estimatedHours: 30, endless: null, coverUrl: null },
    });

    render(<GameFacts game={game} onEdit={() => undefined} />);

    expect(screen.getByText(/unas 30 h · tuya/)).toBeInTheDocument();
  });

  it("enlaza a IGDB", () => {
    const game = buildGame({ pageUrl: "https://www.igdb.com/games/hades" });

    render(<GameFacts game={game} onEdit={() => undefined} />);

    expect(screen.getByRole("link", { name: "IGDB" })).toHaveAttribute("href", "https://www.igdb.com/games/hades");
  });
});

describe("CopyList", () => {
  function renderCopies(copy = buildCopy()) {
    const handlers = { onAdd: vi.fn(), onMarkLost: vi.fn(), onRecover: vi.fn(), onRemove: vi.fn() };
    render(<CopyList copies={[copy]} {...handlers} />);
    return handlers;
  }

  it("Copia vendida", () => {
    const copy = buildCopy({ kind: "physical", acquiredOn: "2023-03-14", lostAt: "2026-11-06", lostReason: "sold" });

    renderCopies(copy);

    expect(screen.getByText("Físico · ya no · mar 2023")).toBeInTheDocument();
    expect(screen.getByText("Lo vendí")).toBeInTheDocument();
  });

  it("una copia vigente ofrece «Ya no lo tengo»", async () => {
    const user = userEvent.setup();
    const copy = buildCopy();
    const { onMarkLost } = renderCopies(copy);

    await user.click(screen.getByRole("button", { name: "Ya no lo tengo" }));

    expect(onMarkLost).toHaveBeenCalledWith(copy);
  });

  it("una copia perdida ofrece recuperarla", async () => {
    const user = userEvent.setup();
    const copy = buildCopy({ lostAt: "2026-11-06" });
    const { onRecover } = renderCopies(copy);

    await user.click(screen.getByRole("button", { name: "Recuperar" }));

    expect(onRecover).toHaveBeenCalledWith(copy);
  });
});

describe("GameScreen", () => {
  const game = buildGame({ id: "juego", title: "Disco Elysium", status: statusByKey("playing"), statusSince: "2026-10-28" });

  it("cambia el estado desde la ventana", async () => {
    const user = userEvent.setup();
    renderScreen(game);

    await user.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await user.click(screen.getByRole("button", { name: "Completado" }));
    await user.click(screen.getByRole("button", { name: "Guardar como «Completado»" }));

    expect(actions.changeStatusAction).toHaveBeenCalledWith("juego", "completed");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("deja la ventana abierta con el error si falla", async () => {
    const user = userEvent.setup();
    actions.changeStatusAction.mockResolvedValue(FAILURE("No pudimos cambiar el estado."));
    renderScreen(game);

    await user.click(screen.getByRole("button", { name: "Cambiar estado" }));
    await user.click(screen.getByRole("button", { name: "Completado" }));
    await user.click(screen.getByRole("button", { name: "Guardar como «Completado»" }));

    expect(await screen.findByText("No pudimos cambiar el estado.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("abre la ventana de copia si viene con ?copy=new", () => {
    const openCopyDialog = true;

    renderScreen(game, openCopyDialog);

    expect(screen.getByRole("dialog", { name: "Agregar copia" })).toBeInTheDocument();
  });

  it("agrega una copia y avisa el cambio de estado", async () => {
    const user = userEvent.setup();
    actions.addCopyAction.mockResolvedValue({ ok: true, data: { notice: "Frostpunk pasó a «Pendiente»" } });
    renderScreen(game);

    await user.click(screen.getByRole("button", { name: "Agregar otra copia" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Tienda" }), "Steam");
    await user.click(screen.getByRole("button", { name: "Guardar copia" }));

    expect(actions.addCopyAction).toHaveBeenCalledWith(
      "juego",
      expect.objectContaining({ storeId: "steam", kind: "purchased", acquiredOn: "" }),
    );
    expect(await screen.findByText("Frostpunk pasó a «Pendiente»")).toHaveAttribute("role", "status");
  });

  it("marca una copia como perdida con su motivo", async () => {
    const user = userEvent.setup();
    renderScreen(buildGame({ id: "juego", copies: [buildCopy({ id: "copia" })] }));

    await user.click(screen.getByRole("button", { name: "Ya no lo tengo" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Motivo" }), "Lo vendí");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(actions.markCopyLostAction).toHaveBeenCalledWith("juego", "copia", "sold", "");
  });

  it("no elimina una copia sin confirmar", async () => {
    const user = userEvent.setup();
    renderScreen(buildGame({ id: "juego", copies: [buildCopy({ id: "copia" })] }));

    await user.click(screen.getByRole("button", { name: "Eliminar copia de Steam" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(actions.removeCopyAction).not.toHaveBeenCalled();
  });

  it("elimina la copia al confirmar", async () => {
    const user = userEvent.setup();
    renderScreen(buildGame({ id: "juego", copies: [buildCopy({ id: "copia" })] }));

    await user.click(screen.getByRole("button", { name: "Eliminar copia de Steam" }));
    await user.click(screen.getByRole("button", { name: "Eliminar copia" }));

    expect(actions.removeCopyAction).toHaveBeenCalledWith("juego", "copia");
  });

  describe("editar", () => {
    it("guarda la duración corregida", async () => {
      const user = userEvent.setup();
      renderScreen(game);

      await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
      await user.type(screen.getByRole("spinbutton", { name: "Duración (h)" }), "30");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(actions.updateCorrectionsAction).toHaveBeenCalledWith(
        "juego",
        expect.objectContaining({ estimatedHours: "30", endless: false }),
      );
    });

    it("«Sin fin» deshabilita la duración", async () => {
      const user = userEvent.setup();
      renderScreen(game);

      await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
      await user.click(screen.getByRole("switch", { name: "Sin fin" }));

      expect(screen.getByRole("spinbutton", { name: "Duración (h)" })).toBeDisabled();
    });
  });

  describe("datos de IGDB", () => {
    it("un juego de IGDB ofrece actualizar y no vincular", async () => {
      const user = userEvent.setup();
      renderScreen(game);

      await user.click(screen.getByRole("button", { name: "Actualizar datos" }));

      expect(actions.refreshFromIgdbAction).toHaveBeenCalledWith("juego");
      expect(screen.queryByRole("button", { name: "Vincular con IGDB" })).not.toBeInTheDocument();
    });

    it("un juego a mano ofrece vincular y muestra la marca", () => {
      const manual = buildGame({ id: "faro", source: "manual", igdbId: null });

      renderScreen(manual);

      expect(screen.getByRole("button", { name: "Vincular con IGDB" })).toBeInTheDocument();
      expect(screen.getByText("A MANO")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Actualizar datos" })).not.toBeInTheDocument();
    });

    it("avisa cuando el juego ya está en la biblioteca", async () => {
      const user = userEvent.setup();
      actions.linkToIgdbAction.mockResolvedValue(FAILURE("Ese juego ya está en tu biblioteca."));
      const search = vi.spyOn(globalThis, "fetch").mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              data: [{ igdbId: 5, baseIgdbId: 5, title: "Hades", year: 2020, coverUrl: null, mark: { kind: "new" } }],
            }),
          ),
      );
      renderScreen(buildGame({ id: "faro", source: "manual", igdbId: null }));

      await user.click(screen.getByRole("button", { name: "Vincular con IGDB" }));
      await user.type(screen.getByRole("searchbox", { name: "Buscar en IGDB" }), "hades");
      await user.click(await screen.findByRole("button", { name: "Vincular" }));

      expect(await screen.findByText("Ese juego ya está en tu biblioteca.")).toBeInTheDocument();
      search.mockRestore();
    });
  });

  describe("quitar de la biblioteca", () => {
    async function openRemoval(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: "Quitar de la biblioteca" }));
      return within(screen.getByRole("dialog", { name: "Quitar de la biblioteca" }));
    }

    it("Cancelar", async () => {
      const user = userEvent.setup();
      renderScreen(game);
      const dialog = await openRemoval(user);

      await user.click(dialog.getByRole("button", { name: "Cancelar" }));

      expect(actions.removeFromLibraryAction).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("avisa que no se puede deshacer", async () => {
      const user = userEvent.setup();
      renderScreen(game);

      const dialog = await openRemoval(user);

      expect(dialog.getByText(/No se puede deshacer/)).toBeInTheDocument();
    });

    it("quita el juego al confirmar", async () => {
      const user = userEvent.setup();
      actions.removeFromLibraryAction.mockResolvedValue(FAILURE("No pudimos quitarlo."));
      renderScreen(game);
      const dialog = await openRemoval(user);

      await user.click(dialog.getByRole("button", { name: "Quitar" }));

      expect(actions.removeFromLibraryAction).toHaveBeenCalledWith("juego");
    });

    it("muestra el error sin cerrar la ventana", async () => {
      const user = userEvent.setup();
      actions.removeFromLibraryAction.mockResolvedValue(FAILURE("No pudimos quitarlo."));
      renderScreen(game);
      const dialog = await openRemoval(user);

      await user.click(dialog.getByRole("button", { name: "Quitar" }));

      expect(await dialog.findByText("No pudimos quitarlo.")).toBeInTheDocument();
    });
  });

  it("marca el juego como «Sin interés»", async () => {
    const user = userEvent.setup();
    renderScreen(game);

    await user.click(screen.getByRole("button", { name: "Marcar sin interés" }));

    expect(actions.setGameNotInterestedAction).toHaveBeenCalledWith("juego", true);
  });

  it("desmarca un juego «Sin interés»", async () => {
    const user = userEvent.setup();
    renderScreen(buildGame({ id: "juego", notInterested: true }));

    await user.click(screen.getByRole("button", { name: "Quitar «Sin interés»" }));

    expect(actions.setGameNotInterestedAction).toHaveBeenCalledWith("juego", false);
  });
});

describe("CopyList con copias de tipo Otro", () => {
  it("Copia de otro tipo", () => {
    const copy = buildCopy({ kind: "other", kindDetail: "Regalo" });

    render(<CopyList copies={[copy]} onAdd={vi.fn()} onMarkLost={vi.fn()} onRecover={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Otro · Regalo")).toBeInTheDocument();
  });

  it("Otro sin detalle", () => {
    const copy = buildCopy({ kind: "other" });

    render(<CopyList copies={[copy]} onAdd={vi.fn()} onMarkLost={vi.fn()} onRecover={vi.fn()} onRemove={vi.fn()} />);

    expect(screen.getByText("Otro")).toBeInTheDocument();
  });
});
