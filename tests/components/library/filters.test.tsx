import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { FilterPanel } from "@/components/library/FilterPanel";
import { GroupTabs } from "@/components/library/GroupTabs";
import { LibrarySort } from "@/components/library/LibrarySort";
import { LibraryToolbar } from "@/components/library/LibraryToolbar";
import { MobileFilters } from "@/components/library/MobileFilters";
import { NoResults } from "@/components/library/NoResults";
import { SelectionBar } from "@/components/library/SelectionBar";
import { StatusFilters } from "@/components/library/StatusFilters";
import { type LibraryFilters, NO_FILTERS } from "@/model/game/filters";
import { countLibraryOptions, listStoreOptions } from "@/model/game/summary";
import { groupStatuses } from "@/model/status/status";

import { buildCopy, buildGame, STATUSES, statusByKey } from "../game/game-fixtures";

const GAMES = [
  buildGame({ id: "a", status: statusByKey("wishlist"), copies: [buildCopy({ kind: "free" })] }),
  buildGame({ id: "b", status: statusByKey("abandoned") }),
];
const GROUPS = groupStatuses(STATUSES);
const COUNTS = countLibraryOptions(GAMES, false);
const STORES = listStoreOptions(GAMES);

function PanelHarness({ onChange }: Readonly<{ onChange?: (changes: Partial<LibraryFilters>) => void }>) {
  const [filters, setFilters] = useState(NO_FILTERS);

  return (
    <FilterPanel
      filters={filters}
      counts={COUNTS}
      stores={STORES}
      onChange={(changes) => {
        setFilters((current) => ({ ...current, ...changes }));
        onChange?.(changes);
      }}
    />
  );
}

function durationSection() {
  return within(screen.getByRole("heading", { name: "Duración estimada" }).closest("section") as HTMLElement);
}

describe("FilterPanel", () => {
  it("Atajo", async () => {
    const user = userEvent.setup();
    render(<PanelHarness />);

    await user.click(durationSection().getByRole("button", { name: "5–15 h" }));

    expect(durationSection().getByLabelText("Desde (h)")).toHaveValue(5);
    expect(durationSection().getByLabelText("Hasta (h)")).toHaveValue(15);
    expect(durationSection().getByRole("button", { name: "5–15 h" })).toHaveAttribute("aria-pressed", "true");
  });

  it("tocar de nuevo un atajo activo lo saca", async () => {
    const user = userEvent.setup();
    render(<PanelHarness />);
    const shortcut = durationSection().getByRole("button", { name: "5–15 h" });
    await user.click(shortcut);

    await user.click(shortcut);

    expect(durationSection().getByLabelText("Desde (h)")).toHaveValue(null);
  });

  it("muestra la cantidad de juegos de cada tienda y tipo", () => {
    render(<PanelHarness />);

    expect(screen.getByRole("button", { name: "Steam 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gratis 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ya no lo tengo 0" })).toBeInTheDocument();
  });

  it("permite elegir varias opciones de un mismo filtro", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PanelHarness onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Gratis 1" }));
    await user.click(screen.getByRole("button", { name: "Comprado 0" }));

    expect(onChange).toHaveBeenLastCalledWith({ kinds: ["free", "purchased"] });
  });

  it("escribe un rango libre con un solo extremo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PanelHarness onChange={onChange} />);

    await user.type(durationSection().getByLabelText("Hasta (h)"), "8");

    expect(onChange).toHaveBeenLastCalledWith({ duration: { min: null, max: 8 } });
  });

  it("activa «Mostrar sin interés»", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PanelHarness onChange={onChange} />);

    await user.click(screen.getByRole("switch", { name: "Mostrar sin interés" }));

    expect(onChange).toHaveBeenCalledWith({ showNotInterested: true });
  });
});

describe("StatusFilters", () => {
  it("muestra cada estado con su cantidad", () => {
    const filters = NO_FILTERS;

    render(<StatusFilters groups={GROUPS} filters={filters} counts={COUNTS} onChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "Quiero jugarlo 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos 2" })).toHaveAttribute("aria-pressed", "true");
  });

  it("elige un grupo entero", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusFilters groups={GROUPS} filters={NO_FILTERS} counts={COUNTS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Dejado" }));

    expect(onChange).toHaveBeenCalledWith({ groups: ["dropped"] });
  });

  it("«Todos» saca el filtro", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filters = { ...NO_FILTERS, statusIds: ["wishlist"] };
    render(<StatusFilters groups={GROUPS} filters={filters} counts={COUNTS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Todos 2" }));

    expect(onChange).toHaveBeenCalledWith({ statusIds: [], groups: [] });
  });
});

describe("GroupTabs", () => {
  it("suma varios grupos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const filters = { ...NO_FILTERS, groups: ["finished" as const] };
    render(<GroupTabs groups={GROUPS} filters={filters} counts={COUNTS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Dejado 1" }));

    expect(onChange).toHaveBeenCalledWith({ groups: ["finished", "dropped"] });
  });
});

describe("LibraryToolbar", () => {
  it("avisa el título que se escribe", async () => {
    const user = userEvent.setup();
    const onTitleChange = vi.fn();
    render(<LibraryToolbar title="" onTitleChange={onTitleChange} onStartSelection={() => undefined} />);

    await user.type(screen.getByRole("textbox", { name: "Buscar por título" }), "c");

    expect(onTitleChange).toHaveBeenCalledWith("c");
  });

  it("no agrega un segundo searchbox a la página", () => {
    render(<LibraryToolbar title="" onTitleChange={() => undefined} onStartSelection={() => undefined} />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("cambia el orden", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<LibrarySort sort="recent" onSortChange={onSortChange} />);

    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar por" }), "Mi puntaje");

    expect(onSortChange).toHaveBeenCalledWith("score");
  });
});

describe("NoResults", () => {
  it("Combinación vacía", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<NoResults onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

    expect(screen.getByText(/No hay juegos con esta combinación de filtros/)).toBeInTheDocument();
    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("MobileFilters", () => {
  function renderFilters(resultCount: number, overrides: { onClear?: () => void } = {}) {
    render(
      <MobileFilters
        open
        onOpenChange={() => undefined}
        groups={GROUPS}
        resultCount={resultCount}
        onClear={overrides.onClear ?? (() => undefined)}
        filters={NO_FILTERS}
        counts={COUNTS}
        stores={STORES}
        onChange={() => undefined}
      />,
    );
  }

  it("Pantalla de filtros del celu", () => {
    const resultCount = 5;

    renderFilters(resultCount);

    expect(screen.getByRole("button", { name: "Ver 5 juegos" })).toBeInTheDocument();
  });

  it("dice «Ver 1 juego» en singular", () => {
    const resultCount = 1;

    renderFilters(resultCount);

    expect(screen.getByRole("button", { name: "Ver 1 juego" })).toBeInTheDocument();
  });

  it("«Limpiar» saca los filtros", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    renderFilters(3, { onClear });

    await user.click(screen.getByRole("button", { name: "Limpiar" }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});

describe("SelectionBar", () => {
  it("usa el singular con un solo juego", () => {
    const count = 1;

    render(
      <SelectionBar
        count={count}
        markLabel="Marcar sin interés"
        pending={false}
        errorMessage={null}
        onMark={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
  });

  it("no deja marcar si no hay nada elegido", () => {
    const count = 0;

    render(
      <SelectionBar
        count={count}
        markLabel="Marcar sin interés"
        pending={false}
        errorMessage={null}
        onMark={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Marcar sin interés" })).toBeDisabled();
  });

  it("marca los elegidos y permite cancelar", async () => {
    const user = userEvent.setup();
    const onMark = vi.fn();
    const onCancel = vi.fn();
    render(
      <SelectionBar
        count={2}
        markLabel="Marcar sin interés"
        pending={false}
        errorMessage={null}
        onMark={onMark}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Marcar sin interés" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onMark).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("muestra el error", () => {
    const errorMessage = "No pudimos guardar.";

    render(
      <SelectionBar
        count={1}
        markLabel="Marcar sin interés"
        pending={false}
        errorMessage={errorMessage}
        onMark={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});

describe("FilterPanel con copias de tipo Otro", () => {
  it("ofrece el tipo «Otro» en «Cómo lo tenés», con su cantidad", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const games = [
      buildGame({ id: "a", copies: [buildCopy({ kind: "other", kindDetail: "Regalo" })] }),
      buildGame({ id: "b", copies: [buildCopy({ kind: "other" })] }),
    ];
    render(
      <FilterPanel filters={NO_FILTERS} counts={countLibraryOptions(games, false)} stores={listStoreOptions(games)} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Otro 2" }));

    expect(onChange).toHaveBeenLastCalledWith({ kinds: ["other"] });
  });
});
