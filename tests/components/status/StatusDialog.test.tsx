import { screen, within } from "@testing-library/react";
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

function renderDialog(endless: boolean, current: Status = statusByKey("playing"), statuses: readonly Status[] = STATUSES) {
  renderWithIntl(
    <StatusDialog
      open
      onOpenChange={() => undefined}
      title="Juego"
      current={current}
      groups={groupStatuses(statuses)}
      endless={endless}
      pending={false}
      errorMessage={null}
      onSave={() => undefined}
    />,
  );
  return screen.getByRole("dialog");
}

describe("StatusDialog", () => {
  it("Líneas de cada estado", () => {
    const dialog = renderDialog(false);

    const lines = [
      ["Jugando", "Lo estás jugando ahora"],
      ["En pausa", "Lo empezaste y pensás volver"],
      ["Quiero jugarlo", "Lo querés jugar pronto, lo tengas o no"],
      ["Backlog", "Lo vas a jugar en algún momento, sin apuro"],
      ["Completado", "Terminaste la historia principal"],
      ["100%", "Lo terminaste todo"],
      ["Abandonado", "Lo jugaste en serio y lo dejaste sin terminar"],
      ["Lo probé", "Lo jugaste un rato y no te enganchó"],
    ];

    for (const [name, meaning] of lines) {
      expect(within(dialog).getByRole("button", { name })).toHaveAccessibleDescription(meaning);
    }
  });

  it("«Jugado» dice qué significa", () => {
    const dialog = renderDialog(true);

    expect(within(dialog).getByRole("button", { name: "Jugado" })).toHaveAccessibleDescription("Un juego sin fin que jugaste y ya no");
  });

  it("Juego sin fin", () => {
    const dialog = renderDialog(true);

    expect(within(dialog).getByRole("button", { name: "Jugado" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Completado" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "100%" })).not.toBeInTheDocument();
  });

  it("Juego con final", () => {
    const dialog = renderDialog(false);

    expect(within(dialog).getByRole("button", { name: "Completado" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "100%" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Jugado" })).not.toBeInTheDocument();
  });

  it("un juego sin fin que ya está en «Completado» lo conserva", () => {
    const dialog = renderDialog(true, statusByKey("completed"));

    expect(within(dialog).getByRole("button", { name: "Completado" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).queryByRole("button", { name: "100%" })).not.toBeInTheDocument();
  });

  it("un estado creado por el usuario se ofrece siempre y no tiene línea", () => {
    const replaying: Status = { id: "rejugando", group: "in_progress", name: "Rejugando", color: "lime", position: 3, systemKey: null };

    const dialog = renderDialog(true, statusByKey("playing"), [...STATUSES, replaying]);

    const button = within(dialog).getByRole("button", { name: "Rejugando" });
    expect(button).not.toHaveAttribute("aria-describedby");
  });

  it("muestra las líneas en inglés", () => {
    renderWithIntl(
      <StatusDialog
        open
        onOpenChange={() => undefined}
        title="Game"
        current={statusByKey("playing")}
        groups={groupStatuses(STATUSES)}
        endless={false}
        pending={false}
        errorMessage={null}
        onSave={() => undefined}
      />,
      { locale: "en" },
    );

    expect(screen.getByRole("button", { name: "Backlog" })).toHaveAccessibleDescription("You'll play it someday, no rush");
  });
});
