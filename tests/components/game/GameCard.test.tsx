import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameCard } from "@/components/game/GameCard";
import { GameCover } from "@/components/game/GameCover";

import { buildCopy, buildGame, statusByKey } from "./game-fixtures";

import { renderWithIntl } from "../../i18n/render-with-intl";

describe("GameCard", () => {
  it("Juego sin copias", () => {
    const game = buildGame({ title: "Frostpunk", status: statusByKey("backlog") });

    const { container } = renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Sin comprar")).toBeInTheDocument();
    expect(container.querySelector('[data-dashed="true"]')).toBeInTheDocument();
  });

  it("Juego sin puntuar", () => {
    const game = buildGame({ title: "Hades", score: null });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.queryByText("/10")).not.toBeInTheDocument();
  });

  it("muestra un puntaje de cero, que no es lo mismo que no tener", () => {
    const game = buildGame({ score: 0 });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("muestra el título, el estado y las horas jugadas", () => {
    const game = buildGame({
      title: "Disco Elysium",
      status: statusByKey("playing"),
      copies: [buildCopy({ playtimeMinutes: 18 * 60 })],
    });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Disco Elysium")).toBeInTheDocument();
    expect(screen.getByText("Jugando")).toBeInTheDocument();
    expect(screen.getByText("18 h")).toBeInTheDocument();
  });

  it("dice «Sin empezar» si tiene copias y no lo jugó", () => {
    const game = buildGame({ copies: [buildCopy({ playtimeMinutes: 0 })] });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Sin empezar")).toBeInTheDocument();
  });

  it("no muestra horas si no tiene copias", () => {
    const game = buildGame({ status: statusByKey("wishlist") });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.queryByText(/ h$/)).not.toBeInTheDocument();
  });

  it("muestra la etiqueta de cada copia", () => {
    const game = buildGame({
      copies: [buildCopy(), buildCopy({ id: "gp", storeName: "Game Pass", kind: "subscription" })],
    });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Steam")).toBeInTheDocument();
    expect(screen.getByText("Game Pass · Suscripción")).toBeInTheDocument();
  });

  it("muestra la marca «A MANO» en un juego cargado a mano", () => {
    const game = buildGame({ source: "manual", igdbId: null });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("A MANO")).toBeInTheDocument();
  });

  it("no muestra «A MANO» en un juego de IGDB", () => {
    const game = buildGame();

    renderWithIntl(<GameCard game={game} />);

    expect(screen.queryByText("A MANO")).not.toBeInTheDocument();
  });

  it("muestra la marca «OCULTO»", () => {
    const game = buildGame({ hidden: true });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("OCULTO")).toBeInTheDocument();
  });

  it("enlaza con la ficha del juego", () => {
    const game = buildGame({ id: "hades", title: "Hades" });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByRole("link", { name: "Ver la ficha de Hades" })).toHaveAttribute("href", "/games/hades");
  });

  it("en modo selección es un botón con su estado", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const game = buildGame({ title: "Hades" });
    renderWithIntl(<GameCard game={game} selection={{ selected: true, onToggle }} />);

    await user.click(screen.getByRole("button", { name: "Seleccionar Hades" }));

    expect(onToggle).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Seleccionar Hades" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("GameCover", () => {
  it("muestra las iniciales cuando no hay portada", () => {
    const title = "Cartas del Faro";

    renderWithIntl(<GameCover title={title} coverUrl={null} variant="card" />);

    expect(screen.getByText("CF")).toBeInTheDocument();
  });

  it("muestra la imagen cuando hay portada", () => {
    const coverUrl = "https://example.com/portada.jpg";

    const { container } = renderWithIntl(<GameCover title="Hades" coverUrl={coverUrl} variant="card" />);

    expect(container.querySelector("img")).toHaveAttribute("src", coverUrl);
    expect(screen.queryByText("H")).not.toBeInTheDocument();
  });

  it("no se rompe con un link a medio escribir", () => {
    const coverUrl = "https:";

    const { container } = renderWithIntl(<GameCover title="Hades" coverUrl={coverUrl} variant="card" />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
  });

  it("cae a las iniciales cuando la portada está rota", () => {
    const { container } = renderWithIntl(<GameCover title="Hades" coverUrl="https://example.com/rota.jpg" variant="card" />);

    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
  });
});

describe("GameCard con copias de tipo Otro", () => {
  it("Copia de otro tipo", () => {
    const game = buildGame({ title: "Celeste", copies: [buildCopy({ kind: "other", kindDetail: "Regalo" })] });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Steam · Regalo")).toBeInTheDocument();
  });

  it("muestra «Otro» si la copia no tiene detalle", () => {
    const game = buildGame({ copies: [buildCopy({ kind: "other" })] });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Steam · Otro")).toBeInTheDocument();
  });
});

describe("GameCard con el puntaje", () => {
  it("Puntaje alto", () => {
    const game = buildGame({ score: 9.8 });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("9.8")).toBeInTheDocument();
    expect(screen.queryByText(/Excelente/)).not.toBeInTheDocument();
  });
});

describe("GameCard con marcas", () => {
  it("Completar al 100%", () => {
    const game = buildGame({ status: statusByKey("completed"), hundredPercent: true });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Completado · 100%")).toBeInTheDocument();
  });

  it("«Lo probé» se ve en violeta", () => {
    const game = buildGame({ status: statusByKey("tried") });

    renderWithIntl(<GameCard game={game} />);

    expect(screen.getByText("Lo probé").style.getPropertyValue("--badge-color")).toBe("var(--color-status-violet)");
  });
});
