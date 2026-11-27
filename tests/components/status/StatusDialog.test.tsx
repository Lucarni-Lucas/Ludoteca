import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { StatusDialog } from "@/components/status/StatusDialog";
import { groupStatuses, type Status } from "@/model/status/status";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { STATUSES, statusByKey } from "../../model/game/library-fixtures";

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

type Options = Partial<{ endless: boolean; hundredPercent: boolean; current: Status; statuses: readonly Status[]; locale: "es" | "en" }>;

function renderDialog({ endless = false, hundredPercent = false, current = statusByKey("playing"), statuses = STATUSES, locale = "es" }: Options = {}) {
  const onSave = vi.fn();
  renderWithIntl(
    <StatusDialog
      open
      onOpenChange={() => undefined}
      title="Juego"
      current={current}
      groups={groupStatuses(statuses)}
      endless={endless}
      hundredPercent={hundredPercent}
      pending={false}
      errorMessage={null}
      onSave={onSave}
    />,
    { locale },
  );
  return { dialog: screen.getByRole("dialog", { name: locale === "es" ? "Cambiar estado" : "Change status" }), onSave };
}

describe("StatusDialog", () => {
  it("Líneas de cada estado", () => {
    const { dialog } = renderDialog();

    const lines = [
      ["Jugando", "Lo estás jugando ahora"],
      ["En pausa", "Lo empezaste y pensás volver"],
      ["Quiero jugarlo", "Lo querés jugar pronto, lo tengas o no"],
      ["Backlog", "Lo vas a jugar en algún momento, sin apuro"],
      ["Completado", "Terminaste la historia principal"],
      ["Jugado", "Un juego sin fin que jugaste y ya no"],
      ["Abandonado", "Lo jugaste en serio y lo dejaste sin terminar"],
      ["Lo probé", "Lo jugaste un rato y no te enganchó"],
    ];

    for (const [name, meaning] of lines) {
      expect(within(dialog).getByRole("button", { name })).toHaveAccessibleDescription(meaning);
    }
    expect(within(dialog).queryByRole("button", { name: "100%" })).not.toBeInTheDocument();
  });

  it("ofrece todos los estados, también a un juego sin fin", () => {
    const { dialog } = renderDialog({ endless: true });

    expect(within(dialog).getByRole("button", { name: "Completado" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Jugado" })).toBeInTheDocument();
  });

  it("Jugado en un juego con final", async () => {
    const user = userEvent.setup();
    const { dialog, onSave } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: "Jugado" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar como «Jugado»" }));
    const confirm = screen.getByRole("dialog", { name: "Marca «Sin fin»" });
    expect(confirm).toHaveTextContent("Esto le pone la marca «Sin fin» al juego. ¿Estás de acuerdo?");
    await user.click(within(confirm).getByRole("button", { name: "Aceptar" }));

    expect(onSave).toHaveBeenCalledWith("played", { acceptEndless: true });
  });

  it("Completado en un juego sin fin", async () => {
    const user = userEvent.setup();
    const { dialog, onSave } = renderDialog({ endless: true });

    await user.click(within(dialog).getByRole("button", { name: "Completado" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar como «Completado»" }));
    const confirm = screen.getByRole("dialog", { name: "Marca «Sin fin»" });
    expect(confirm).toHaveTextContent("Esto le saca la marca «Sin fin» al juego. ¿Estás de acuerdo?");
    await user.click(within(confirm).getByRole("button", { name: "Cancelar" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Marca «Sin fin»" })).not.toBeInTheDocument();
  });

  it("un estado que no cambia la marca se guarda sin aviso y sin marcas", async () => {
    const user = userEvent.setup();
    const { dialog, onSave } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: "Abandonado" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar como «Abandonado»" }));

    expect(screen.queryByRole("dialog", { name: "Marca «Sin fin»" })).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith("abandoned", undefined);
  });

  it("Completar al 100%", async () => {
    const user = userEvent.setup();
    const { dialog, onSave } = renderDialog();
    expect(within(dialog).queryByRole("checkbox", { name: "Lo completé al 100%" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Completado" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Lo completé al 100%" }));
    await user.click(within(dialog).getByRole("button", { name: "Guardar como «Completado»" }));

    expect(onSave).toHaveBeenCalledWith("completed", { hundredPercent: true });
  });

  it("la casilla arranca marcada en un juego que ya está al 100%", () => {
    const { dialog } = renderDialog({ current: statusByKey("completed"), hundredPercent: true });

    expect(within(dialog).getByRole("checkbox", { name: "Lo completé al 100%" })).toBeChecked();
  });

  it("un estado creado por el usuario se ofrece siempre y no tiene línea", () => {
    const replaying: Status = { id: "rejugando", group: "in_progress", name: "Rejugando", color: "lime", position: 3, systemKey: null };

    const { dialog } = renderDialog({ endless: true, statuses: [...STATUSES, replaying] });

    expect(within(dialog).getByRole("button", { name: "Rejugando" })).not.toHaveAttribute("aria-describedby");
  });

  it("muestra las líneas, la casilla y el aviso en inglés", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog({ locale: "en" });

    expect(within(dialog).getByRole("button", { name: "Backlog" })).toHaveAccessibleDescription("You'll play it someday, no rush");
    await user.click(within(dialog).getByRole("button", { name: "Completed" }));
    expect(within(dialog).getByRole("checkbox", { name: "I completed it 100%" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Played" }));
    await user.click(within(dialog).getByRole("button", { name: /^Save as/ }));
    expect(screen.getByRole("dialog", { name: "“Endless” mark" })).toHaveTextContent("This adds the “Endless” mark to the game. Do you agree?");
  });
});
