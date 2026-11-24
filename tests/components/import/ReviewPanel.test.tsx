import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReviewPanel, type ReviewPanelProps } from "@/components/import/ReviewPanel";
import type { ImportCandidate, ImportEntry } from "@/model/import/import-entry";
import { buildReview, type ImportReview, type ReviewGame, reviewGame } from "@/model/import/review";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { entry, EPIC, ignItem, openReview, playniteItem, STEAM, steamItem } from "../../model/import/import-fixtures";

const STATUSES = [
  { statusKey: "backlog", name: "Pendiente" },
  { statusKey: "playing", name: "Jugando" },
  { statusKey: "completed", name: "Completado" },
];

function view(value: ImportEntry, steamConnected = true): ReviewGame {
  return reviewGame(value, [], { steamConnected }) as ReviewGame;
}

function reviewOf(...entries: ImportEntry[]): ImportReview {
  return buildReview(openReview(entries), { steamConnected: true });
}

function renderPanel(overrides: Partial<ReviewPanelProps> & Pick<ReviewPanelProps, "group" | "games">) {
  const props: ReviewPanelProps = {
    statuses: STATUSES,
    busy: false,
    steamConnected: true,
    errorMessage: null,
    onDecide: vi.fn(async () => reviewOf()),
    onNotify: vi.fn(),
    renderSearch: () => <p>Buscador de IGDB</p>,
    ...overrides,
  };
  renderWithIntl(<ReviewPanel {...props} />);
  return { onDecide: props.onDecide, onNotify: props.onNotify };
}

function candidate(igdbId: number, title: string, year: number | null): ImportCandidate {
  return { igdbId, baseIgdbId: igdbId, title, year, coverUrl: null };
}

const operator = () => view(entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })]));
const beholder = () => view(entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)]));

const CRASH_CANDIDATES = [
  candidate(1, "Crash Bandicoot", 1996),
  candidate(2, "Crash Bandicoot", 2017),
  candidate(3, "Crash Bandicoot: The Wrath of Cortex", 2001),
  candidate(4, "Crash Bandicoot 4: It's About Time", 2020),
  candidate(5, "Crash Bandicoot Nitro Kart 3D", 2008),
];

function crashEntry(): ImportEntry {
  return entry("Crash Bandicoot", [ignItem("Crash Bandicoot", { year: 1996, matchState: "candidates", candidates: CRASH_CANDIDATES })], {
    igdbId: null,
    catalogGameId: null,
    catalog: null,
  });
}

describe("ReviewPanel", () => {
  describe("grupos de lote", () => {
    it("Sugerencia marcada", () => {
      const game = operator();

      renderPanel({ group: "play", games: [game] });

      const options = screen.getByRole("radiogroup", { name: "Qué hacer con 112 Operator" });
      expect(within(options).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Pendiente", "Sin interés", "No importar"]);
      expect(within(options).getByRole("radio", { name: "Pendiente" })).toHaveAttribute("aria-checked", "true");
    });

    it("Decidir pasa a «Listos para importar»", async () => {
      const { onDecide, onNotify } = renderPanel({ group: "play", games: [beholder()] });

      await userEvent.click(screen.getByRole("radio", { name: "Sin interés" }));

      expect(onDecide).toHaveBeenCalledWith([expect.any(String)], { kind: "choose", choice: { kind: "not_interested" } });
      expect(onNotify).toHaveBeenCalledWith("«Beholder» pasó a «Listos para importar» con «Sin interés».");
    });

    it("Pasar lo marcado en lote", async () => {
      const games = [
        view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")])),
        view(entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")])),
      ];
      const { onDecide, onNotify } = renderPanel({ group: "family", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Portal 2" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Watch Dogs" }));
      expect(screen.getByRole("group", { name: "Selección" })).toHaveTextContent("2 seleccionados");
      await userEvent.click(screen.getByRole("button", { name: "Pasar a Listos" }));

      expect(onDecide).toHaveBeenCalledWith(games.map((game) => game.entryId), { kind: "accept" });
      expect(onNotify).toHaveBeenCalledWith("2 juegos pasaron a «Listos para importar».");
    });

    it("Cambiar el tipo en lote", async () => {
      const games = ["A", "B", "C", "D", "E"].map((title) => view(entry(title, [playniteItem(title, EPIC, title, { playtimeMinutes: 0 })])));
      const { onDecide } = renderPanel({ group: "play", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 5" }));
      await userEvent.click(screen.getByRole("button", { name: "¿Cómo lo conseguiste?" }));
      await userEvent.selectOptions(screen.getByLabelText("¿Cómo lo conseguiste en Epic Games?"), "purchased");
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

    it("muestra de dónde vino cada juego", () => {
      const hollowKnight = view(
        entry("Hollow Knight", [ignItem("Hollow Knight", { ignStatuses: ["backlog"], ignScore: 9 }), steamItem("Hollow Knight", "367520", 0)]),
      );

      renderPanel({ group: "play", games: [hollowKnight] });

      expect(screen.getByText("IGN · Backlog · 9")).toBeInTheDocument();
      expect(screen.getByText("Steam · Comprado · 0 h")).toBeInTheDocument();
    });

    it("«Elegí un estado» ofrece el selector con Pendiente marcado", async () => {
      const terraria = view(entry("Terraria", [steamItem("Terraria", "105600", 720)]));
      const { onDecide } = renderPanel({ group: "status", games: [terraria] });

      expect(screen.getByLabelText("Estado de Terraria")).toHaveValue("backlog");
      await userEvent.selectOptions(screen.getByLabelText("Estado de Terraria"), "playing");
      await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));

      expect(onDecide).toHaveBeenCalledWith([terraria.entryId], { kind: "choose", choice: { kind: "status", statusKey: "playing" } });
    });

    it("después de decidir, el foco pasa a la fila que quedó en su lugar", async () => {
      const [first, second] = [beholder(), operator()];
      // Como en la pantalla: la revisión nueva llega antes de que la decisión termine.
      let showAfterDecision: () => void = () => undefined;
      const panel = (games: readonly ReviewGame[]) => (
        <ReviewPanel
          group="play"
          games={games}
          statuses={STATUSES}
          busy={false}
          steamConnected
          errorMessage={null}
          onDecide={async () => {
            showAfterDecision();
            return reviewOf();
          }}
          onNotify={vi.fn()}
          renderSearch={() => null}
        />
      );
      const { rerender } = renderWithIntl(panel([first, second]));
      showAfterDecision = () => rerender(panel([second]));

      await userEvent.click(within(screen.getByRole("radiogroup", { name: "Qué hacer con Beholder" })).getByRole("radio", { name: "Sin interés" }));

      expect(screen.getByRole("checkbox", { name: "Seleccionar 112 Operator" })).toHaveFocus();
    });

    it("si no se guarda, no dice que pasó a «Listos para importar»", async () => {
      const { onDecide, onNotify } = renderPanel({ group: "play", games: [beholder()], onDecide: vi.fn(async () => null) });

      await userEvent.click(screen.getByRole("radio", { name: "Sin interés" }));

      expect(onDecide).toHaveBeenCalled();
      expect(onNotify).not.toHaveBeenCalled();
    });
  });

  describe("preguntas de a un juego", () => {
    it("Elegir entre varios", async () => {
      const crash = view(crashEntry());
      const { onDecide, onNotify } = renderPanel({ group: "which", games: [crash] });

      const options = screen.getByRole("radiogroup", { name: "¿Cuál es Crash Bandicoot?" });
      const cards = within(options).getAllByRole("radio");
      await userEvent.click(cards[2]);

      expect(screen.getByText("En IGN:").closest("p")).toHaveTextContent("En IGN: Crash Bandicoot · 1996");
      expect(cards).toHaveLength(5);
      expect(cards.every((card) => card.getAttribute("aria-checked") === "false")).toBe(true);
      expect(cards[2]).toHaveTextContent("Crash Bandicoot: The Wrath of Cortex2001");
      expect(onDecide).toHaveBeenCalledWith([crash.entryId], { kind: "choose", choice: { kind: "candidate", candidate: CRASH_CANDIDATES[2] } });
      expect(onNotify).toHaveBeenCalledWith(
        "«Crash Bandicoot» pasó a «Listos para importar» con «Crash Bandicoot: The Wrath of Cortex (2001)».",
      );
    });

    it("Un solo candidato con otro nombre", async () => {
      const ultimate = candidate(9, "Castlevania: Anniversary Collection - Ultimate Edition", 2019);
      const castlevania = view(
        entry(
          "Castlevania Anniversary Collection",
          [playniteItem("Castlevania Anniversary Collection", EPIC, "castle", { year: 2019, matchState: "candidates", candidates: [ultimate] })],
          { igdbId: null, catalogGameId: null, catalog: null },
        ),
      );
      const { onDecide } = renderPanel({ group: "which", games: [castlevania] });

      const options = screen.getByRole("radiogroup", { name: "¿Cuál es Castlevania Anniversary Collection?" });
      await userEvent.click(within(options).getByRole("radio", { name: "Sí" }));

      expect(screen.getByText("¿Es este juego?")).toBeInTheDocument();
      expect(screen.getByText("En Epic:").closest("p")).toHaveTextContent("En Epic: Castlevania Anniversary Collection · 2019");
      expect(within(options).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Sí", "No, lo busco yo", "No importar"]);
      expect(onDecide).toHaveBeenCalledWith([castlevania.entryId], { kind: "choose", choice: { kind: "candidate", candidate: ultimate } });
    });

    it("Buscar otro", async () => {
      renderPanel({ group: "which", games: [view(crashEntry())] });

      await userEvent.click(screen.getByRole("button", { name: "Ninguno, lo busco yo" }));

      expect(screen.getByText("Buscador de IGDB")).toBeInTheDocument();
    });

    it("Terminado y abandonado", async () => {
      const overwatch = view(entry("Overwatch", [ignItem("Overwatch", { year: 2022, ignStatuses: ["beat", "quit"] })]));
      const { onDecide } = renderPanel({ group: "how_left", games: [overwatch] });

      const options = screen.getByRole("radiogroup", { name: "¿Cómo dejaste Overwatch?" });
      await userEvent.click(within(options).getByRole("radio", { name: "Lo abandonaste" }));

      expect(screen.getByText("IGN lo tiene como terminado y como abandonado.")).toBeInTheDocument();
      expect(within(options).getAllByRole("radio").map((radio) => radio.textContent)).toEqual([
        "Lo terminaste",
        "Lo abandonaste",
        "Otro estado",
        "No importar",
      ]);
      expect(within(options).getAllByRole("radio").every((radio) => radio.getAttribute("aria-checked") === "false")).toBe(true);
      expect(onDecide).toHaveBeenCalledWith([overwatch.entryId], { kind: "choose", choice: { kind: "status", statusKey: "abandoned" } });
    });

    it("«Otro estado» abre el selector de estados", async () => {
      const overwatch = view(entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]));
      renderPanel({ group: "how_left", games: [overwatch] });

      await userEvent.click(screen.getByRole("radio", { name: "Otro estado" }));

      expect(screen.getByLabelText("Estado de Overwatch")).toBeInTheDocument();
    });

    it("Juego viejo sin cruce", async () => {
      const crash = view(
        entry("Crash", [ignItem("Crash Bandicoot", { matchState: "not_found", ignStatuses: ["beat"] })], { catalog: null, igdbId: null }),
      );
      renderPanel({ group: "not_found", games: [crash] });

      const buttons = ["Buscar con otro nombre", "Cargar a mano", "No importar"].map((name) => screen.getByRole("button", { name }));
      await userEvent.click(buttons[0]);

      expect(screen.queryByRole("radio", { checked: true })).not.toBeInTheDocument();
      expect(screen.getByText("Buscador de IGDB")).toBeInTheDocument();
    });

    it("una entrada que no es juego dice que no parece un juego", () => {
      const redacted = view(entry("[REDACTED]", [playniteItem("[REDACTED]", EPIC, "x", { matchState: "not_found" })], { catalog: null, igdbId: null }));

      renderPanel({ group: "not_found", games: [redacted] });

      expect(screen.getByText("No parece un juego: es un soundtrack, una beta o un nombre oculto.")).toBeInTheDocument();
    });

    it("en las preguntas, la barra de selección ofrece solo «No importar»", async () => {
      const games = [view(crashEntry())];
      const { onDecide, onNotify } = renderPanel({ group: "which", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Crash Bandicoot" }));
      const bar = screen.getByRole("group", { name: "Selección" });
      await userEvent.click(within(bar).getByRole("button", { name: "No importar" }));

      expect(within(bar).queryByRole("button", { name: "Pasar a Listos" })).not.toBeInTheDocument();
      expect(onDecide).toHaveBeenCalledWith([games[0].entryId], { kind: "choose", choice: { kind: "exclude" } });
      expect(onNotify).toHaveBeenCalledWith("«Crash Bandicoot» no se va a importar.");
    });
  });

  describe("«Listos para importar»", () => {
    it("Cómo va a entrar", () => {
      const decided = view(
        entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })], { answers: { playAnswer: "keep" } }),
      );

      renderPanel({ group: "ready", games: [decided] });

      expect(screen.getByText("Entra como Pendiente · Epic Games · Gratis")).toBeInTheDocument();
    });

    it("un juego que ya está en la biblioteca dice qué copias suma", () => {
      const hades = entry("Hades", [ignItem("Hades", { ignStatuses: ["backlog"] }), playniteItem("Hades", EPIC, "hades")]);
      const library = [{ catalogGameId: hades.catalogGameId ?? "", libraryGameId: "game-1", copies: [{ storeId: STEAM.id, storeGameId: null }] }];
      const game = reviewGame(hades, library, { steamConnected: true }) as ReviewGame;

      renderPanel({ group: "ready", games: [game] });

      expect(screen.getByText("Ya está en tu biblioteca · suma Epic Games · Gratis")).toBeInTheDocument();
    });

    it("«Sin interés» y «sin fin» se suman a cómo entra", () => {
      const games = [
        view(entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "1", 0)], { answers: { playAnswer: "not_interested" } })),
        view(entry("Among Us", [ignItem("Among Us", { ignStatuses: ["beat"] })], { multiplayerOnly: true, answers: { endlessAnswer: true } })),
      ];

      renderPanel({ group: "ready", games });

      expect(screen.getByText("Entra como Pendiente · Sin interés · Steam · Comprado")).toBeInTheDocument();
      expect(screen.getByText("Entra como Jugado · sin fin")).toBeInTheDocument();
    });

    it("Volver después de elegir un candidato", async () => {
      const chosen = view(
        entry("Crash Bandicoot", [
          ignItem("Crash Bandicoot", { ignStatuses: ["beat"], matchState: "candidates", candidates: CRASH_CANDIDATES, chosenIgdbId: 1 }),
        ]),
      );
      const back = crashEntry();
      const next = reviewOf({ ...back, items: back.items.map((value) => ({ ...value, id: chosen.itemIds[0] })) });
      const { onDecide, onNotify } = renderPanel({ group: "ready", games: [chosen], onDecide: vi.fn(async () => next) });

      await userEvent.click(screen.getByRole("button", { name: "Volver a revisar" }));

      expect(onDecide).toHaveBeenCalledWith([chosen.entryId], { kind: "reset" });
      expect(onNotify).toHaveBeenCalledWith("«Crash Bandicoot» volvió a «¿Cuál de estos es?».");
    });

    it("un juego que no decidió el usuario no ofrece «Volver a revisar»", () => {
      const celeste = view(entry("Celeste", [ignItem("Celeste", { ignStatuses: ["playing"], ignScore: 9 })]));

      renderPanel({ group: "ready", games: [celeste] });

      expect(screen.queryByRole("button", { name: "Volver a revisar" })).not.toBeInTheDocument();
    });
  });

  describe("textos largos", () => {
    it("un nombre largo y sus candidatos se leen enteros", () => {
      const long = "The Legend of Heroes: Trails of Cold Steel IV - The End of Saga - Digital Deluxe Edition with Every Bonus";
      const candidates = [candidate(1, `${long} (PC)`, 2021), candidate(2, `${long} Remastered`, 2023)];
      const game = view(entry(long, [ignItem(long, { matchState: "candidates", candidates })], { igdbId: null, catalog: null }));

      renderPanel({ group: "which", games: [game] });

      expect(screen.getByText(long)).toHaveTextContent(long);
      const cards = within(screen.getByRole("radiogroup", { name: `¿Cuál es ${long}?` })).getAllByRole("radio");
      expect(cards[0]).toHaveTextContent(`${long} (PC)2021`);
      expect(cards[1]).toHaveTextContent(`${long} Remastered2023`);
    });
  });
});
