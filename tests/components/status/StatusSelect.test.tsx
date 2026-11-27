import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StatusSelect } from "@/components/status/StatusSelect";
import { groupStatuses } from "@/model/status/status";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { STATUSES } from "../../model/game/library-fixtures";

function renderSelect(value = "", onChange = vi.fn()) {
  renderWithIntl(
    <label>
      Estado
      <StatusSelect groups={groupStatuses(STATUSES)} value={value} onChange={onChange} />
    </label>,
  );
  return { onChange, select: screen.getByRole("combobox", { name: "Estado" }) };
}

describe("StatusSelect", () => {
  it("arranca en «Backlog» con su línea debajo", () => {
    const { select } = renderSelect();

    expect(select).toHaveDisplayValue("Backlog");
    expect(select).toHaveAccessibleDescription("Lo vas a jugar en algún momento, sin apuro");
  });

  it("ofrece todos los estados, también «Jugado», y no «100%»", () => {
    renderSelect();

    const options = screen.getAllByRole("option").map((option) => option.textContent);

    expect(options).toContain("Jugado");
    expect(options).toContain("Completado");
    expect(options).not.toContain("100%");
  });

  it("muestra la línea del estado elegido", async () => {
    const { select, onChange } = renderSelect("playing");

    await userEvent.selectOptions(select, "Lo probé");

    expect(onChange).toHaveBeenCalledWith("tried");
    expect(select).toHaveAccessibleDescription("Lo estás jugando ahora");
  });
});
