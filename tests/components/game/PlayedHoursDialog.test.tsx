import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameFacts, GameHeaderFacts } from "@/components/game/GameFacts";
import { PlayedHoursDialog } from "@/components/game/PlayedHoursDialog";

import { buildCopy, buildGame } from "./game-fixtures";

function renderDialog(manualPlayedMinutes: number | null, errorMessage: string | null = null) {
  const onSave = vi.fn();
  render(
    <PlayedHoursDialog
      open
      onOpenChange={() => undefined}
      manualPlayedMinutes={manualPlayedMinutes}
      pending={false}
      errorMessage={errorMessage}
      onSave={onSave}
    />,
  );
  return onSave;
}

describe("PlayedHoursDialog", () => {
  it("Cargar las horas en la ficha", async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(null);

    await user.type(screen.getByRole("textbox", { name: "Horas jugadas" }), "70");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalledWith(70);
  });

  it("acepta la coma decimal", async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(null);

    await user.type(screen.getByRole("textbox", { name: "Horas jugadas" }), "12,5");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalledWith(12.5);
  });

  it("arranca con el total cargado", () => {
    const minutes = 750;

    renderDialog(minutes);

    expect(screen.getByRole("textbox", { name: "Horas jugadas" })).toHaveValue("12.5");
  });

  it("Borrar las horas", async () => {
    const user = userEvent.setup();
    const onSave = renderDialog(4200);

    await user.click(screen.getByRole("button", { name: "Borrar horas" }));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it("sin total cargado no ofrece borrarlo", () => {
    const minutes = null;

    renderDialog(minutes);

    expect(screen.queryByRole("button", { name: "Borrar horas" })).not.toBeInTheDocument();
  });

  it("Horas negativas: muestra el error del servidor", () => {
    const errorMessage = "Poné las horas jugadas, de 0 en adelante";

    renderDialog(null, errorMessage);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});

describe("las horas jugadas en la ficha", () => {
  it("Cargar las horas en la ficha: muestra el total a mano", () => {
    const game = buildGame({ manualPlayedMinutes: 70 * 60, copies: [buildCopy({ playtimeMinutes: 60 })] });

    render(<GameFacts game={game} onEdit={() => undefined} onEditPlayed={() => undefined} />);

    expect(screen.getByText("Jugaste").nextElementSibling).toHaveTextContent("70 h");
    expect(screen.getByRole("button", { name: "Cambiar horas" })).toBeInTheDocument();
  });

  it("sin total a mano ofrece cargarlo", async () => {
    const user = userEvent.setup();
    const onEditPlayed = vi.fn();
    const game = buildGame();
    render(<GameHeaderFacts game={game} onEdit={() => undefined} onEditPlayed={onEditPlayed} />);

    await user.click(screen.getByRole("button", { name: "Cargar horas" }));

    expect(screen.getByText(/0 h jugadas/)).toBeInTheDocument();
    expect(onEditPlayed).toHaveBeenCalled();
  });
});
