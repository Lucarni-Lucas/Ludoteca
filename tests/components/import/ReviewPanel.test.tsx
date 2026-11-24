import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReviewPanel, type ReviewPanelProps } from "@/components/import/ReviewPanel";
import type { ImportEntry } from "@/model/import/import-entry";
import { type ReviewGame, reviewGame } from "@/model/import/review";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { entry, EPIC, ignItem, playniteItem, STEAM, steamItem } from "../../model/import/import-fixtures";

const STATUSES = [
  { statusKey: "backlog", name: "Pendiente" },
  { statusKey: "playing", name: "Jugando" },
  { statusKey: "completed", name: "Completado" },
];

function view(value: ImportEntry, steamConnected = true): ReviewGame {
  return reviewGame(value, [], { steamConnected }) as ReviewGame;
}

function renderPanel(overrides: Partial<ReviewPanelProps> & Pick<ReviewPanelProps, "group" | "games">) {
  const onDecide = vi.fn(async () => true);
  const props: ReviewPanelProps = {
    statuses: STATUSES,
    busy: false,
    steamConnected: true,
    errorMessage: null,
    onDecide,
    renderSearch: () => <p>Buscador de IGDB</p>,
    ...overrides,
  };
  renderWithIntl(<ReviewPanel {...props} />);
  return { onDecide: props.onDecide };
}

const operator = () => view(entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })]));
const beholder = () => view(entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)]));

describe("ReviewPanel", () => {
  it("Sugerencia marcada", () => {
    const game = operator();

    renderPanel({ group: "play", games: [game] });

    const options = screen.getByRole("radiogroup", { name: "Qué hacer con 112 Operator" });
    expect(within(options).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Pendiente", "Sin interés", "No importar"]);
    expect(within(options).getByRole("radio", { name: "Pendiente" })).toHaveAttribute("aria-checked", "true");
  });

  it("Decidir pasa a «Listos»", async () => {
    const { onDecide } = renderPanel({ group: "play", games: [beholder()] });

    await userEvent.click(screen.getByRole("radio", { name: "Sin interés" }));

    expect(onDecide).toHaveBeenCalledWith([expect.any(String)], { kind: "choose", choice: { kind: "not_interested" } });
    expect(screen.getByRole("status")).toHaveTextContent("«Beholder» pasó a «Listos» con «Sin interés».");
  });

  it("Pasar lo marcado en lote", async () => {
    const games = [
      view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")])),
      view(entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")])),
    ];
    const { onDecide } = renderPanel({ group: "family", games });

    await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Portal 2" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Watch Dogs" }));
    expect(screen.getByRole("group", { name: "Selección" })).toHaveTextContent("2 seleccionados");
    await userEvent.click(screen.getByRole("button", { name: "Pasar a Listos" }));

    expect(onDecide).toHaveBeenCalledWith(games.map((game) => game.entryId), { kind: "accept" });
    expect(screen.getByRole("status")).toHaveTextContent("2 juegos pasaron a «Listos».");
  });

  it("Cambiar el tipo en lote", async () => {
    const games = ["A", "B", "C", "D", "E"].map((title) => view(entry(title, [playniteItem(title, EPIC, title, { playtimeMinutes: 0 })])));
    const { onDecide } = renderPanel({ group: "play", games });

    await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Tipo de copia" }));
    await userEvent.selectOptions(screen.getByLabelText("Tipo de copia en Epic Games"), "purchased");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onDecide).toHaveBeenCalledWith(
      games.map((game) => game.entryId),
      { kind: "copy_kind", storeId: EPIC.id, copyKind: "purchased" },
    );
  });

  it("Juego instalado de un familiar con la cuenta sin conectar espera sin opciones y con el aviso", () => {
    const portal = view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]), false);

    renderPanel({ group: "family", games: [portal], steamConnected: false });

    expect(screen.getByText("Conectá tu cuenta de Steam para saber cuáles son tuyos.")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByText("Steam · en tu PC")).toBeInTheDocument();
  });

  it("Juego instalado de un familiar con la cuenta conectada sugiere Familia", () => {
    const portal = view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]));

    renderPanel({ group: "family", games: [portal] });

    expect(screen.getByRole("radio", { name: "Familia" })).toHaveAttribute("aria-checked", "true");
  });

  it("Juego viejo sin cruce", async () => {
    const crash = view(
      entry("Crash", [ignItem("Crash Bandicoot", { matchState: "not_found", ignStatuses: ["beat"] })], { catalog: null, igdbId: null }),
    );
    renderPanel({ group: "not_found", games: [crash] });

    const options = screen.getByRole("radiogroup", { name: "Qué hacer con Crash Bandicoot" });
    expect(within(options).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Cargar a mano", "No importar"]);
    await userEvent.click(screen.getByRole("button", { name: "Buscar con otro nombre" }));

    expect(screen.getByText("Buscador de IGDB")).toBeInTheDocument();
  });

  it("muestra de dónde vino cada juego", () => {
    const hollowKnight = view(
      entry("Hollow Knight", [ignItem("Hollow Knight", { ignStatuses: ["beat"], ignScore: 9 }), steamItem("Hollow Knight", "367520", 2880)]),
    );

    renderPanel({ group: "ready", games: [hollowKnight] });

    expect(screen.getByText("IGN · Beat · 9")).toBeInTheDocument();
    expect(screen.getByText("Steam · Comprado · 48 h")).toBeInTheDocument();
  });

  it("«Volver a revisar» en «Listos» devuelve el juego", async () => {
    const decided = view(
      entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] })], { answers: { playAnswer: "not_interested" } }),
    );
    const { onDecide } = renderPanel({ group: "ready", games: [decided] });

    await userEvent.click(screen.getByRole("button", { name: "Volver a revisar" }));

    expect(onDecide).toHaveBeenCalledWith([decided.entryId], { kind: "reset" });
    expect(screen.getByRole("status")).toHaveTextContent("«Beholder» volvió a revisión.");
  });

  it("«Elegí un estado» ofrece el selector con Pendiente marcado", async () => {
    const terraria = view(entry("Terraria", [steamItem("Terraria", "105600", 720)]));
    const { onDecide } = renderPanel({ group: "status", games: [terraria] });

    expect(screen.getByLabelText("Estado de Terraria")).toHaveValue("backlog");
    await userEvent.selectOptions(screen.getByLabelText("Estado de Terraria"), "playing");
    await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onDecide).toHaveBeenCalledWith([terraria.entryId], { kind: "choose", choice: { kind: "status", statusKey: "playing" } });
  });

  it("si no se guarda, no dice que pasó a «Listos»", async () => {
    const { onDecide } = renderPanel({ group: "play", games: [beholder()], onDecide: vi.fn(async () => false) });

    await userEvent.click(screen.getByRole("radio", { name: "Sin interés" }));

    expect(onDecide).toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
