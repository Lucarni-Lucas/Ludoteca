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
  { statusKey: "paused", name: "En pausa" },
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
    it("Nada marcado", () => {
      const game = operator();

      renderPanel({ group: "play", games: [game] });

      const options = screen.getByRole("group", { name: "Respuestas para 112 Operator" });
      expect(within(options).getAllByRole("button").map((button) => button.textContent)).toEqual(["Sí, algún día", "No", "No importar"]);
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(within(options).getAllByRole("button").some((button) => button.hasAttribute("aria-pressed"))).toBe(false);
    });

    it("la explicación de «¿Lo vas a jugar alguna vez?» dice la diferencia entre «No» y «No importar»", () => {
      const game = operator();

      renderPanel({ group: "play", games: [game] });

      expect(
        screen.getByText(
          "Los tenés en alguna tienda, pero no tienen puntaje o nunca los abriste. «No» los suma a tu biblioteca como «Sin interés»: no los ves en la lista, pero «¿Lo tengo?» sabe que son tuyos. «No importar» los deja afuera.",
        ),
      ).toBeInTheDocument();
    });

    it("Decidir pasa a «Listos para importar»", async () => {
      const { onDecide, onNotify } = renderPanel({ group: "play", games: [beholder()] });

      await userEvent.click(screen.getByRole("button", { name: "No" }));

      expect(onDecide).toHaveBeenCalledWith([expect.any(String)], { kind: "choose", choice: { kind: "not_interested" } });
      expect(onNotify).toHaveBeenCalledWith("«Beholder» pasó a «Listos para importar» con «Sin interés».");
    });

    it("Responder en lote", async () => {
      const games = [
        view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")])),
        view(entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")])),
      ];
      const { onDecide, onNotify } = renderPanel({ group: "family", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Portal 2" }));
      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Watch Dogs" }));
      expect(screen.getByRole("group", { name: "Selección" })).toHaveTextContent("2 seleccionados");
      const bar = screen.getByRole("group", { name: "Selección" });
      await userEvent.click(within(bar).getByRole("button", { name: "Sí, es de mi familia" }));

      expect(within(bar).queryByRole("button", { name: "Pasar a Listos" })).not.toBeInTheDocument();
      expect(onDecide).toHaveBeenCalledWith(games.map((game) => game.entryId), {
        kind: "choose",
        choice: { kind: "copy_kind", copyKind: "family" },
      });
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
      expect(screen.queryByRole("group", { name: "Respuestas para Portal 2" })).not.toBeInTheDocument();
      expect(screen.getByText("Steam · en tu PC")).toBeInTheDocument();
    });

    it("Juego instalado de un familiar", async () => {
      const portal = view(entry("Portal 2", [playniteItem("Portal 2", STEAM, "620")]));
      const { onDecide, onNotify } = renderPanel({ group: "family", games: [portal] });

      const options = screen.getByRole("group", { name: "Respuestas para Portal 2" });
      await userEvent.click(within(options).getByRole("button", { name: "Sí, es de mi familia" }));

      expect(within(options).getAllByRole("button").map((button) => button.textContent)).toEqual([
        "Sí, es de mi familia",
        "No, es mío",
        "No importar",
      ]);
      expect(onDecide).toHaveBeenCalledWith([portal.entryId], { kind: "choose", choice: { kind: "copy_kind", copyKind: "family" } });
      expect(onNotify).toHaveBeenCalledWith("«Portal 2» pasó a «Listos para importar» con «Steam · Familia».");
    });

    it("muestra de dónde vino cada juego", () => {
      const hollowKnight = view(
        entry("Hollow Knight", [ignItem("Hollow Knight", { ignStatuses: ["backlog"], ignScore: 9 }), steamItem("Hollow Knight", "367520", 0)]),
      );

      renderPanel({ group: "play", games: [hollowKnight] });

      expect(screen.getByText("IGN · Backlog · 9")).toBeInTheDocument();
      expect(screen.getByText("Steam · Comprado · 0 h")).toBeInTheDocument();
    });

    it("Juego jugado que no estaba en IGN", async () => {
      const terraria = view(entry("Terraria", [steamItem("Terraria", "105600", 720)]));
      const { onDecide } = renderPanel({ group: "status", games: [terraria] });

      const options = screen.getByRole("group", { name: "Respuestas para Terraria" });
      await userEvent.click(within(options).getByRole("button", { name: "Lo estoy jugando" }));

      expect(within(options).getAllByRole("button").map((button) => button.textContent)).toEqual([
        "Lo estoy jugando",
        "Lo terminé",
        "Lo abandoné",
        "Lo probé",
        "Otro estado",
        "No importar",
      ]);
      expect(onDecide).toHaveBeenCalledWith([terraria.entryId], { kind: "choose", choice: { kind: "status", statusKey: "playing" } });
    });

    it("Otro estado", async () => {
      const frostpunk = view(entry("Frostpunk", [steamItem("Frostpunk", "323190", 720)]));
      const { onDecide, onNotify } = renderPanel({ group: "status", games: [frostpunk] });

      await userEvent.click(screen.getByRole("button", { name: "Otro estado" }));
      const list = screen.getByRole("group", { name: "Estado de Frostpunk" });
      await userEvent.click(within(list).getByRole("button", { name: "En pausa" }));

      expect(within(list).getAllByRole("button").map((button) => button.textContent)).toEqual(["Pendiente", "Jugando", "Completado", "En pausa"]);
      expect(onDecide).toHaveBeenCalledWith([frostpunk.entryId], { kind: "choose", choice: { kind: "status", statusKey: "paused" } });
      expect(onNotify).toHaveBeenCalledWith("«Frostpunk» pasó a «Listos para importar» con «En pausa».");
    });

    it("«Otro estado» en la barra de selección vale para todos los seleccionados", async () => {
      const games = ["Frostpunk", "Terraria"].map((title, index) => view(entry(title, [steamItem(title, String(index), 720)])));
      const { onDecide } = renderPanel({ group: "status", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 2" }));
      const bar = screen.getByRole("group", { name: "Selección" });
      await userEvent.click(within(bar).getByRole("button", { name: "Otro estado" }));
      await userEvent.click(within(screen.getByRole("group", { name: "Estado de 2 juegos" })).getByRole("button", { name: "Completado" }));

      expect(onDecide).toHaveBeenCalledWith(games.map((game) => game.entryId), {
        kind: "choose",
        choice: { kind: "status", statusKey: "completed" },
      });
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

      await userEvent.click(within(screen.getByRole("group", { name: "Respuestas para Beholder" })).getByRole("button", { name: "No" }));

      expect(screen.getByRole("checkbox", { name: "Seleccionar 112 Operator" })).toHaveFocus();
    });

    it("si no se guarda, no dice que pasó a «Listos para importar»", async () => {
      const { onDecide, onNotify } = renderPanel({ group: "play", games: [beholder()], onDecide: vi.fn(async () => null) });

      await userEvent.click(screen.getByRole("button", { name: "No" }));

      expect(onDecide).toHaveBeenCalled();
      expect(onNotify).not.toHaveBeenCalled();
    });
  });

  describe("preguntas de a un juego", () => {
    it("Elegir entre varios", async () => {
      const crash = view(crashEntry());
      const { onDecide, onNotify } = renderPanel({ group: "which", games: [crash] });

      const options = screen.getByRole("group", { name: "¿Cuál es Crash Bandicoot?" });
      const cards = within(options).getAllByRole("button");
      await userEvent.click(cards[2]);

      expect(screen.getByText("En IGN:").closest("p")).toHaveTextContent("En IGN: Crash Bandicoot · 1996");
      expect(cards).toHaveLength(5);
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
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

      const options = screen.getByRole("group", { name: "¿Cuál es Castlevania Anniversary Collection?" });
      await userEvent.click(within(options).getByRole("button", { name: "Sí" }));

      expect(screen.getByText("¿Es este juego?")).toBeInTheDocument();
      expect(screen.getByText("En Epic:").closest("p")).toHaveTextContent("En Epic: Castlevania Anniversary Collection · 2019");
      expect(within(options).getAllByRole("button").map((button) => button.textContent)).toEqual(["Sí", "No, lo busco yo", "No importar"]);
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

      const options = screen.getByRole("group", { name: "¿Cómo dejaste Overwatch?" });
      await userEvent.click(within(options).getByRole("button", { name: "Lo abandonaste" }));

      expect(screen.getByText("IGN lo tiene como terminado y como abandonado.")).toBeInTheDocument();
      expect(within(options).getAllByRole("button").map((button) => button.textContent)).toEqual([
        "Lo terminaste",
        "Lo abandonaste",
        "Otro estado",
        "No importar",
      ]);
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(onDecide).toHaveBeenCalledWith([overwatch.entryId], { kind: "choose", choice: { kind: "status", statusKey: "abandoned" } });
    });

    it("«Otro estado» abre la lista de estados, sin ninguno marcado", async () => {
      const overwatch = view(entry("Overwatch", [ignItem("Overwatch", { ignStatuses: ["beat", "quit"] })]));
      renderPanel({ group: "how_left", games: [overwatch] });

      await userEvent.click(screen.getByRole("button", { name: "Otro estado" }));

      expect(screen.getByRole("button", { name: "Otro estado" })).toHaveAttribute("aria-expanded", "true");
      expect(within(screen.getByRole("group", { name: "Estado de Overwatch" })).getAllByRole("button")).toHaveLength(STATUSES.length);
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
      const redacted = view(entry("Cuphead Demo", [playniteItem("Cuphead Demo", EPIC, "x", { matchState: "not_found" })], { catalog: null, igdbId: null }));

      renderPanel({ group: "not_found", games: [redacted] });

      expect(screen.getByText("No parece un juego: es una demo, una beta, un soundtrack o algo parecido.")).toBeInTheDocument();
    });

    it("Fortnite de IGN y de Epic", () => {
      const fortnites = [candidate(1, "Fortnite", 2017), candidate(2, "Fortnite", 2018)];
      const both = view(
        entry(
          "Fortnite",
          [
            ignItem("Fortnite", { year: 2017, matchState: "candidates", candidates: fortnites }),
            playniteItem("Fortnite", EPIC, "Fortnite", { year: 2020, matchState: "candidates", candidates: fortnites }),
          ],
          { igdbId: null, catalogGameId: null, catalog: null },
        ),
      );

      renderPanel({ group: "which", games: [both] });

      expect(screen.getByText("En IGN:").closest("p")).toHaveTextContent("En IGN: Fortnite · 2017");
      expect(screen.getByText("En Epic:").closest("p")).toHaveTextContent("En Epic: Fortnite · 2020");
      expect(within(screen.getByRole("group", { name: "¿Cuál es Fortnite?" })).getAllByRole("button")).toHaveLength(2);
    });

    it("Elegido sin jugar", async () => {
      const love = candidate(40, "Love", 2015);
      const waiting = entry("LOVE", [playniteItem("LOVE", EPIC, "love", { matchState: "candidates", candidates: [love, candidate(41, "Love", 2022)] })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });
      const game = view(waiting);
      const chosen = entry("Love", waiting.items.map((value) => ({ ...value, chosenIgdbId: 40 })), { igdbId: 40 });
      const { onNotify } = renderPanel({ group: "which", games: [game], onDecide: vi.fn(async () => reviewOf(chosen)) });

      await userEvent.click(within(screen.getByRole("group", { name: "¿Cuál es LOVE?" })).getAllByRole("button")[0]);

      expect(onNotify).toHaveBeenCalledWith("«LOVE» pasó a «¿Lo vas a jugar alguna vez?».");
    });

    it("en lote, si cada juego fue a un grupo distinto, el aviso cuenta cuántos fueron a cada uno", async () => {
      const portal = entry("Portal 2", [playniteItem("Portal 2", STEAM, "620"), playniteItem("Portal 2", EPIC, "p")]);
      const watchDogs = entry("Watch Dogs", [playniteItem("Watch Dogs", STEAM, "243470")]);
      const family = (value: ImportEntry) => ({ ...value, items: value.items.map((row) => (row.store === STEAM ? { ...row, copyKind: "family" as const } : row)) });
      const { onNotify } = renderPanel({
        group: "family",
        games: [view(portal), view(watchDogs)],
        onDecide: vi.fn(async () => reviewOf(family(portal), family(watchDogs))),
      });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 2" }));
      await userEvent.click(within(screen.getByRole("group", { name: "Selección" })).getByRole("button", { name: "Sí, es de mi familia" }));

      expect(onNotify).toHaveBeenCalledWith("2 juegos cambiaron de grupo: 1 a «¿Lo vas a jugar alguna vez?» y 1 a «Listos para importar».");
    });

    it("en «No lo encontré», la barra de selección no ofrece «Cargar a mano»: es de a un juego", async () => {
      const games = ["Juego viejo", "Otro viejo"].map((title) =>
        view(entry(title, [ignItem(title, { matchState: "not_found" })], { igdbId: null, catalogGameId: null, catalog: null })),
      );
      renderPanel({ group: "not_found", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 2" }));

      const bar = screen.getByRole("group", { name: "Selección" });
      expect(within(bar).queryByRole("button", { name: "Cargar a mano" })).not.toBeInTheDocument();
      expect(within(bar).getByRole("button", { name: "No importar" })).toBeInTheDocument();
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

    it("Volver desde otro grupo", async () => {
      const love = candidate(40, "Love", 2015);
      const chosen = view(entry("Love", [playniteItem("LOVE", EPIC, "love", { matchState: "candidates", candidates: [love], chosenIgdbId: 40 })], { igdbId: 40 }));
      const back = entry("LOVE", [playniteItem("LOVE", EPIC, "love", { matchState: "candidates", candidates: [love, candidate(41, "Love", 2022)] })], {
        igdbId: null,
        catalogGameId: null,
        catalog: null,
      });
      const next = reviewOf({ ...back, items: back.items.map((value) => ({ ...value, id: chosen.itemIds[0] })) });
      const { onDecide, onNotify } = renderPanel({ group: "play", games: [chosen], onDecide: vi.fn(async () => next) });

      await userEvent.click(screen.getByRole("button", { name: "Volver a revisar" }));

      expect(onDecide).toHaveBeenCalledWith([chosen.entryId], { kind: "reset" });
      expect(onNotify).toHaveBeenCalledWith("«LOVE» volvió a «¿Cuál de estos es?».");
    });

    it("«Volver a revisar» no aparece en un juego sin respuestas", () => {
      renderPanel({ group: "play", games: [operator()] });

      expect(screen.queryByRole("button", { name: "Volver a revisar" })).not.toBeInTheDocument();
    });

    it("la barra ofrece «Volver a revisar» si alguno de los seleccionados tiene respuesta", async () => {
      const love = candidate(40, "Love", 2015);
      const chosen = view(entry("Love", [playniteItem("LOVE", EPIC, "love", { matchState: "candidates", candidates: [love], chosenIgdbId: 40 })], { igdbId: 40 }));
      const { onDecide } = renderPanel({ group: "play", games: [chosen, operator()] });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 2" }));
      await userEvent.click(within(screen.getByRole("group", { name: "Selección" })).getByRole("button", { name: "Volver a revisar" }));

      expect(onDecide).toHaveBeenCalledWith(expect.arrayContaining([chosen.entryId]), { kind: "reset" });
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

    it("Arrepentirse de «No importar»", async () => {
      const excluded = entry("112 Operator", [playniteItem("112 Operator", EPIC, "operator", { playtimeMinutes: 0 })], {
        answers: { excluded: true },
      });
      const game = view(excluded);
      const back = { ...excluded, answers: { ...excluded.answers, excluded: false } };
      const { onDecide, onNotify } = renderPanel({ group: "ready", games: [game], onDecide: vi.fn(async () => reviewOf(back)) });

      await userEvent.click(screen.getByRole("button", { name: "Volver a revisar" }));

      expect(screen.getByText("No se importa")).toBeInTheDocument();
      expect(screen.queryByText(/Entra como/)).not.toBeInTheDocument();
      expect(onDecide).toHaveBeenCalledWith([game.entryId], { kind: "reset" });
      expect(onNotify).toHaveBeenCalledWith("«112 Operator» volvió a «¿Lo vas a jugar alguna vez?».");
    });

    it("en lote, la barra de «Listos para importar» ofrece «Volver a revisar» para los que tienen «No importar»", async () => {
      const games = ["Doom", "Quake"].map((title) =>
        view(entry(title, [playniteItem(title, EPIC, title, { playtimeMinutes: 0 })], { answers: { excluded: true } })),
      );
      const { onDecide } = renderPanel({ group: "ready", games });

      await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar los 2" }));
      await userEvent.click(within(screen.getByRole("group", { name: "Selección" })).getByRole("button", { name: "Volver a revisar" }));

      expect(onDecide).toHaveBeenCalledWith(games.map((value) => value.entryId), { kind: "reset" });
    });

    it("Demo sin su juego", async () => {
      const demo = view(
        entry("Cuphead Demo", [playniteItem("Cuphead Demo", STEAM, "268910", { matchState: "not_found" })], {
          igdbId: null,
          catalogGameId: null,
          catalog: null,
          answers: { excluded: true },
        }),
      );
      const { onDecide } = renderPanel({ group: "ready", games: [demo] });

      await userEvent.click(screen.getByRole("button", { name: "Volver a revisar" }));

      expect(screen.getByText("Cuphead Demo")).toBeInTheDocument();
      expect(screen.getByText("No se importa · no es un juego")).toBeInTheDocument();
      expect(onDecide).toHaveBeenCalledWith([demo.entryId], { kind: "reset" });
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
      const cards = within(screen.getByRole("group", { name: `¿Cuál es ${long}?` })).getAllByRole("button");
      expect(cards[0]).toHaveTextContent(`${long} (PC)2021`);
      expect(cards[1]).toHaveTextContent(`${long} Remastered2023`);
    });
  });
});
