import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreControl } from "@/components/game/ScoreControl";

const SAVE_DELAY_MS = 400;

beforeAll(() => {
  // Radix Slider lo necesita y jsdom no lo implementa.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

describe("ScoreControl", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(score: number | null) {
    const onSave = vi.fn();
    const utils = render(<ScoreControl score={score} errorMessage={null} onSave={onSave} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    return { onSave, user, ...utils };
  }

  async function waitForSave(): Promise<void> {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    });
  }

  it("Puntaje cero", () => {
    const score = 0;

    setup(score);

    expect(screen.getByText("0.0", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Puntaje" })).toHaveValue("0.0");
  });

  it("Tope superior", async () => {
    const { user, onSave } = setup(10);

    await user.click(screen.getByRole("button", { name: "Subir 0.1" }));
    await waitForSave();

    expect(screen.getByRole("textbox", { name: "Puntaje" })).toHaveValue("10.0");
    expect(onSave).toHaveBeenLastCalledWith(10);
  });

  it("Quitar", async () => {
    const { user, onSave } = setup(7);

    await user.click(screen.getByRole("button", { name: "Quitar puntaje" }));

    expect(onSave).toHaveBeenCalledWith(null);
    expect(screen.getByText("Sin puntaje", { selector: "output" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Puntaje" })).toHaveValue("");
  });

  it("sin puntaje no ofrece quitarlo", () => {
    const score = null;

    setup(score);

    expect(screen.queryByRole("button", { name: "Quitar puntaje" })).not.toBeInTheDocument();
  });

  it("el primer toque define el puntaje", async () => {
    const { user, onSave } = setup(null);

    await user.click(screen.getByRole("button", { name: "Subir 0.1" }));
    await waitForSave();

    expect(onSave).toHaveBeenCalledWith(0.1);
  });

  it("no baja de cero", async () => {
    const { user, onSave } = setup(0);

    await user.click(screen.getByRole("button", { name: "Bajar 0.1" }));
    await waitForSave();

    expect(onSave).toHaveBeenLastCalledWith(0);
  });

  it("muestra el cambio al instante y guarda una sola vez después de la espera", async () => {
    const { user, onSave } = setup(7);

    await user.click(screen.getByRole("button", { name: "Subir 0.1" }));
    await user.click(screen.getByRole("button", { name: "Subir 0.1" }));

    expect(screen.getByRole("textbox", { name: "Puntaje" })).toHaveValue("7.2");
    expect(onSave).not.toHaveBeenCalled();
    await waitForSave();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(7.2);
  });

  it("guarda lo escrito en el campo, redondeado", async () => {
    const { user, onSave } = setup(null);

    await user.type(screen.getByRole("textbox", { name: "Puntaje" }), "9.35");
    await waitForSave();

    expect(onSave).toHaveBeenLastCalledWith(9.4);
  });

  it("no guarda un número fuera de rango y al salir vuelve al valor anterior", async () => {
    const { user, onSave } = setup(7);
    const field = screen.getByRole("textbox", { name: "Puntaje" });

    await user.clear(field);
    await user.type(field, "11");
    await waitForSave();
    await user.tab();

    expect(onSave).not.toHaveBeenCalledWith(11);
    expect(field).toHaveValue("1.0");
  });

  it("guarda lo pendiente si el usuario se va antes de la espera", async () => {
    const { user, onSave, unmount } = setup(7);

    await user.click(screen.getByRole("button", { name: "Subir 0.1" }));
    unmount();

    expect(onSave).toHaveBeenCalledWith(7.1);
  });

  it("muestra el error de guardado", () => {
    const errorMessage = "No pudimos guardar el puntaje.";

    render(<ScoreControl score={7} errorMessage={errorMessage} onSave={() => undefined} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("toma el puntaje nuevo si cambia desde afuera", () => {
    const { rerender } = render(<ScoreControl score={7} errorMessage={null} onSave={() => undefined} />);

    rerender(<ScoreControl score={8} errorMessage={null} onSave={() => undefined} />);

    expect(screen.getByRole("textbox", { name: "Puntaje" })).toHaveValue("8.0");
  });
});

describe("ScoreControl solo con el número", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Puntaje alto", () => {
    const score = 9.8;

    render(<ScoreControl score={score} errorMessage={null} onSave={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Puntaje" })).toHaveValue("9.8");
    expect(screen.getByText("9.8", { selector: "output" })).toBeInTheDocument();
    expect(screen.queryByText(/Excelente/)).not.toBeInTheDocument();
  });
});
