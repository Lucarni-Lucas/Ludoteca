import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeAll(() => {
  // La barra del puntaje usa Radix Slider, que lo necesita, y jsdom no lo implementa.
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
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
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
    await user.click(within(screen.getByRole("dialog", { name: "Agregar «Hades»" })).getByRole("button", { name: "Guardar juego" }));

    expect(addFromIgdbAction).toHaveBeenCalledWith(1, { copies: [], statusId: "", score: null });
    expect(await screen.findByRole("link", { name: "Agregado" })).toHaveAttribute("href", "/games/juego");
  });

  it("muestra el error si no se pudo agregar", async () => {
    const user = userEvent.setup();
    mockSearch([result({ kind: "new" })]);
    addFromIgdbAction.mockResolvedValue({ ok: false, error: { code: "X", message: "No pudimos agregarlo." } });
    const input = renderScreen();
    await user.type(input, "hades");

    await user.click(await screen.findByRole("button", { name: "Agregar" }));
    await user.click(within(screen.getByRole("dialog", { name: "Agregar «Hades»" })).getByRole("button", { name: "Guardar juego" }));

    expect(await within(screen.getByRole("dialog")).findByText("No pudimos agregarlo.")).toBeInTheDocument();
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

    expect(screen.getByText("Todavía no lo tenés")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar una copia" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Año de lanzamiento" })).toHaveValue(null);
    expect(screen.getByRole("combobox", { name: "Estado" })).toHaveDisplayValue("Según las copias");
    expect(screen.getByText("Sin puntaje", { selector: "output" })).toBeInTheDocument();
  });

  it("manda lo que se cargó", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByRole("textbox", { name: "Título" }), "Cartas del Faro");
    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Tienda" }), "itch.io");
    await user.click(screen.getByRole("button", { name: "Gratis" }));
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cartas del Faro",
        copies: [{ storeId: "itch", kind: "free", otherStoreName: "", familyOwner: "", kindDetail: "" }],
      }),
    );
  });

  it("con «Otra» pide el nombre y manda solo ese dato", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Tienda" }), "Otra");
    await user.type(screen.getByRole("textbox", { name: "Nombre de la tienda" }), "Humble Store");
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ copies: [expect.objectContaining({ storeId: "", otherStoreName: "Humble Store" })] }),
    );
  });

  it("con «Familia» pregunta de quién es", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));

    await user.click(screen.getByRole("button", { name: "Familia" }));

    expect(screen.getByRole("textbox", { name: "De quién es" })).toBeInTheDocument();
  });

  it("no pregunta de quién es en otro tipo", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));

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

describe("ManualGameForm con varias copias", () => {
  function renderForm() {
    const onSubmit = vi.fn();
    render(
      <ManualGameForm
        stores={STORES}
        statusGroups={GROUPS}
        pending={false}
        errorMessage={null}
        uploading={false}
        uploadError={null}
        onUploadCover={vi.fn(async () => undefined)}
        onSubmit={onSubmit}
      />,
    );
    return onSubmit;
  }

  it("con una copia, el botón pasa a «Agregar otra copia»", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));

    expect(screen.getByRole("button", { name: "Agregar otra copia" })).toBeInTheDocument();
    expect(screen.queryByText("Todavía no lo tenés")).not.toBeInTheDocument();
  });

  it("Quitar una fila antes de guardar", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Cartas del Faro");
    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));
    await user.selectOptions(within(screen.getByRole("group", { name: "Copia 1" })).getByRole("combobox", { name: "Tienda" }), "itch.io");
    await user.click(screen.getByRole("button", { name: "Agregar otra copia" }));

    await user.click(screen.getByRole("button", { name: "Quitar la copia 2" }));
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ copies: [expect.objectContaining({ storeId: "itch", kind: "purchased" })] }),
    );
  });

  it("quitar la fila del medio no le pasa sus datos a la siguiente", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));
    await user.click(screen.getByRole("button", { name: "Agregar otra copia" }));
    await user.click(within(screen.getByRole("group", { name: "Copia 2" })).getByRole("button", { name: "Gratis" }));

    await user.click(screen.getByRole("button", { name: "Quitar la copia 1" }));
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ copies: [expect.objectContaining({ kind: "free" })] }));
  });

  it("una copia Otro pide qué es, como dato opcional", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.click(screen.getByRole("button", { name: "Agregar una copia" }));
    await user.click(screen.getByRole("button", { name: "Otro" }));

    await user.type(screen.getByRole("textbox", { name: "Qué es" }), "Regalo");
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(screen.getByRole("textbox", { name: "Qué es" })).toHaveAttribute("placeholder", "opcional");
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ copies: [expect.objectContaining({ kind: "other", kindDetail: "Regalo" })] }),
    );
  });

  it("manda el puntaje elegido", async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Hades");

    await user.type(screen.getByRole("textbox", { name: "Puntaje" }), "9.5");
    await user.click(screen.getByRole("button", { name: "Guardar juego" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ score: 9.5 }));
  });

  it("Link de la página", () => {
    renderForm();

    const optional = ["Link a la página del juego", "Año de lanzamiento", "Duración (h)"].map(
      (name) => screen.getByLabelText(name).getAttribute("placeholder"),
    );

    expect(optional).toEqual(["opcional", "opcional", "opcional"]);
  });

  it("Título obligatorio", () => {
    renderForm();

    const title = screen.getByRole("textbox", { name: "Título" });

    expect(title).not.toHaveAttribute("placeholder", "opcional");
  });
});

describe("AddGameScreen con el formulario de IGDB", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
  });

  async function openDialog() {
    const user = userEvent.setup();
    mockSearch([result({ kind: "new" })]);
    render(<AddGameScreen stores={STORES} statusGroups={GROUPS} />);
    await user.type(screen.getByRole("searchbox", { name: "Buscar juego" }), "hades");
    await user.click(await screen.findByRole("button", { name: "Agregar" }));
    return { user, dialog: screen.getByRole("dialog", { name: "Agregar «Hades»" }) };
  }

  it("arranca sin copias, en «Según las copias» y sin puntaje", async () => {
    const { dialog } = await openDialog();

    const view = within(dialog);

    expect(view.getByText("Todavía no lo tenés")).toBeInTheDocument();
    expect(view.getByRole("combobox", { name: "Estado" })).toHaveDisplayValue("Según las copias");
    expect(view.getByText("Sin puntaje", { selector: "output" })).toBeInTheDocument();
    expect(view.queryByRole("textbox", { name: "Título" })).not.toBeInTheDocument();
  });

  it("manda las copias y el puntaje, y deja el resultado en «Agregado»", async () => {
    addFromIgdbAction.mockResolvedValue({ ok: true, data: { kind: "added", gameId: "hades" } });
    const { user, dialog } = await openDialog();
    const view = within(dialog);
    await user.click(view.getByRole("button", { name: "Agregar una copia" }));
    await user.selectOptions(view.getByRole("combobox", { name: "Tienda" }), "itch.io");
    await user.type(view.getByRole("textbox", { name: "Puntaje" }), "9.5");

    await user.click(view.getByRole("button", { name: "Guardar juego" }));

    expect(addFromIgdbAction).toHaveBeenCalledWith(1, {
      copies: [{ storeId: "itch", otherStoreName: "", kind: "purchased", familyOwner: "", kindDetail: "" }],
      statusId: "",
      score: 9.5,
    });
    expect(await screen.findByRole("link", { name: "Agregado" })).toHaveAttribute("href", "/games/hades");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancelar no agrega nada", async () => {
    const { user, dialog } = await openDialog();

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(addFromIgdbAction).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
  });
});
