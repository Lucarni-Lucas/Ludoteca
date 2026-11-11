import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AddGameScreen } from "@/app/(app)/add/add-game-screen";
import { AddResultAction } from "@/components/game/AddResultAction";
import { ManualGameForm } from "@/components/game/ManualGameForm";
import type { MarkedSearchResult } from "@/model/game/add-game";
import { groupStatuses } from "@/model/status/status";

import { STATUSES } from "./game-fixtures";

const { addFromIgdbAction, addManualGameAction, uploadCoverAction } = vi.hoisted(() => ({
  addFromIgdbAction: vi.fn(),
  addManualGameAction: vi.fn(),
  uploadCoverAction: vi.fn(),
}));

vi.mock("@/app/(app)/add/actions", () => ({ addFromIgdbAction, addManualGameAction, uploadCoverAction }));

const GROUPS = groupStatuses(STATUSES);
const STORES = [{ id: "itch", name: "itch.io", slug: "itch-io" }];

function result(mark: MarkedSearchResult["mark"]): MarkedSearchResult {
  return { igdbId: 1, baseIgdbId: 1, title: "Hades", year: 2020, coverUrl: null, mark };
}

function mockSearch(data: readonly MarkedSearchResult[]) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, data }))));
}

describe("AddGameScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderScreen() {
    render(<AddGameScreen stores={STORES} statusGroups={GROUPS} />);
    return screen.getByRole("searchbox", { name: "Buscar juego" });
  }

  it("Texto demasiado corto", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const input = renderScreen();

    await user.type(input, "h");

    expect(screen.getByText("Escribí al menos 2 letras")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Juego que no está en IGDB", async () => {
    const user = userEvent.setup();
    mockSearch([]);
    const input = renderScreen();

    await user.type(input, "Cartas del Faro");

    expect(await screen.findByText("No encontramos “Cartas del Faro” en IGDB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agregar a mano" })).toHaveAttribute("href", "/add/manual");
  });

  it("muestra el título y el año de cada resultado", async () => {
    const user = userEvent.setup();
    mockSearch([result({ kind: "new" })]);
    const input = renderScreen();

    await user.type(input, "hades");

    expect(await screen.findByText("Hades")).toBeInTheDocument();
    expect(screen.getByText("2020 · IGDB")).toBeInTheDocument();
  });

  it("agrega un resultado y lo convierte en un link a la ficha", async () => {
    const user = userEvent.setup();
    mockSearch([result({ kind: "new" })]);
    addFromIgdbAction.mockResolvedValue({ ok: true, data: { kind: "added", gameId: "juego" } });
    const input = renderScreen();
    await user.type(input, "hades");

    await user.click(await screen.findByRole("button", { name: "Agregar" }));

    expect(addFromIgdbAction).toHaveBeenCalledWith(1);
    expect(await screen.findByRole("link", { name: "Agregado" })).toHaveAttribute("href", "/games/juego");
  });

  it("muestra el error si no se pudo agregar", async () => {
    const user = userEvent.setup();
    mockSearch([result({ kind: "new" })]);
    addFromIgdbAction.mockResolvedValue({ ok: false, error: { code: "X", message: "No pudimos agregarlo." } });
    const input = renderScreen();
    await user.type(input, "hades");

    await user.click(await screen.findByRole("button", { name: "Agregar" }));

    expect(await screen.findByText("No pudimos agregarlo.")).toBeInTheDocument();
  });
});

describe("AddResultAction", () => {
  it("Juego ya cargado", () => {
    const owned = result({ kind: "in_library", gameId: "hades" });

    render(<AddResultAction result={owned} addedGameId={undefined} pending={false} onAdd={() => undefined} />);

    expect(screen.getByText("En tu biblioteca")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar" })).not.toBeInTheDocument();
  });

  it("Juego en la wishlist", () => {
    const wished = result({ kind: "wishlist", gameId: "hades" });

    render(<AddResultAction result={wished} addedGameId={undefined} pending={false} onAdd={() => undefined} />);

    expect(screen.getByText("En «Quiero jugarlo»")).toBeInTheDocument();
  });

  it("un resultado ya cargado ofrece «Agregar una copia»", () => {
    const owned = result({ kind: "in_library", gameId: "hades" });

    render(<AddResultAction result={owned} addedGameId={undefined} pending={false} onAdd={() => undefined} />);

    expect(screen.getByRole("link", { name: "Agregar una copia" })).toHaveAttribute("href", "/games/hades?copy=new");
  });
});

describe("ManualGameForm", () => {
  function renderForm(overrides: Partial<Parameters<typeof ManualGameForm>[0]> = {}) {
    const onSubmit = vi.fn();
    const onUploadCover = vi.fn(async (_file: File): Promise<string | undefined> => undefined);

    render(
      <ManualGameForm
        stores={STORES}
        statusGroups={GROUPS}
        pending={false}
        errorMessage={null}
        uploading={false}
        uploadError={null}
        onUploadCover={onUploadCover}
        onSubmit={onSubmit}
        {...overrides}
      />,
    );

    return { onSubmit, onUploadCover };
  }

  it("empieza con los valores vacíos, no con los del prototipo", () => {
    renderForm();

    expect(screen.getByRole("combobox", { name: "Dónde lo tenés" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Todavía no lo tengo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("spinbutton", { name: "Año" })).toHaveValue(null);
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveDisplayValue("Según las copias");
  });

  it("manda lo que se cargó", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByRole("textbox", { name: "Título" }), "Cartas del Faro");
    await user.selectOptions(screen.getByRole("combobox", { name: "Dónde lo tenés" }), "itch.io");
    await user.click(screen.getByRole("button", { name: "Gratis" }));
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Cartas del Faro", storeId: "itch", kind: "free", otherStoreName: "" }),
    );
  });

  it("con «Otra» pide el nombre y manda solo ese dato", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.selectOptions(screen.getByRole("combobox", { name: "Dónde lo tenés" }), "Otra");
    await user.type(screen.getByRole("textbox", { name: "Nombre de la tienda" }), "Humble Store");
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ storeId: "", otherStoreName: "Humble Store" }));
  });

  it("con «Familia» pregunta de quién es", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Familia" }));

    expect(screen.getByRole("textbox", { name: "De quién es" })).toBeInTheDocument();
  });

  it("no pregunta de quién es en otro tipo", () => {
    renderForm();

    expect(screen.queryByRole("textbox", { name: "De quién es" })).not.toBeInTheDocument();
  });

  it("actualiza las iniciales de la portada con el título", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole("textbox", { name: "Título" }), "Cartas del Faro");

    expect(screen.getByText("CF")).toBeInTheDocument();
  });

  it("muestra el error del servidor", () => {
    const errorMessage = "Poné el título del juego";

    renderForm({ errorMessage });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("sube la imagen elegida y usa la URL que vuelve", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onUploadCover = vi.fn(async () => "https://example.com/portada.png");
    const { onSubmit } = renderForm({ onUploadCover });
    const file = new File(["imagen"], "portada.png", { type: "image/png" });

    await user.upload(screen.getByLabelText("Archivo de la portada"), file);
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onUploadCover).toHaveBeenCalledWith(file);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: "https://example.com/portada.png" }));
  });

  it("muestra el mensaje de un archivo rechazado", () => {
    const uploadError = "La portada tiene que ser JPEG, PNG o WebP.";

    renderForm({ uploadError });

    expect(screen.getByText(uploadError)).toBeInTheDocument();
  });

  it("deja pegar un link de portada", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Pegar link" }));
    await user.type(screen.getByLabelText("Link de la portada"), "https://example.com/a.png");
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ coverUrl: "https://example.com/a.png" }));
  });

  it("no deja guardar dos veces mientras se guarda", () => {
    const pending = true;

    renderForm({ pending });

    expect(screen.getByRole("button", { name: "Guardar juego" })).toBeDisabled();
  });
});
