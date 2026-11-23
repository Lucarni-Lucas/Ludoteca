import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatusCard } from "@/components/status/StatusCard";

import { renderWithIntl } from "../../i18n/render-with-intl";
import { statusByKey } from "../game/game-fixtures";

describe("nombres de los estados", () => {
  it.each([
    { locale: "en", expected: "Want to play" },
    { locale: "es", expected: "Quiero jugarlo" },
  ] as const)("Estado por defecto ($locale)", ({ locale, expected }) => {
    const wishlist = statusByKey("wishlist");

    renderWithIntl(<StatusCard status={wishlist} statusSince="2026-10-28" onChange={vi.fn()} />, { locale });

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("un estado renombrado se ve tal cual", () => {
    const renamed = { ...statusByKey("wishlist"), name: "Algún día" };

    renderWithIntl(<StatusCard status={renamed} statusSince="2026-10-28" onChange={vi.fn()} />, { locale: "en" });

    expect(screen.getByText("Algún día")).toBeInTheDocument();
  });

  it("un nombre de fábrica de otro system_key no se traduce", () => {
    const borrowed = { ...statusByKey("wishlist"), name: "Jugando" };

    renderWithIntl(<StatusCard status={borrowed} statusSince="2026-10-28" onChange={vi.fn()} />, { locale: "en" });

    expect(screen.getByText("Jugando")).toBeInTheDocument();
  });

  it.each([
    { name: "en curso desde una fecha, en español", key: "playing", locale: "es", expected: "En curso · desde el 28 oct" },
    { name: "en curso desde una fecha, en inglés", key: "playing", locale: "en", expected: "In progress · since Oct 28" },
    { name: "terminado con su fecha de fin, en inglés", key: "completed", locale: "en", expected: "Finished · you finished it on Oct 28" },
  ] as const)("$name", ({ key, locale, expected }) => {
    const status = statusByKey(key);

    renderWithIntl(<StatusCard status={status} statusSince="2026-10-28" onChange={vi.fn()} />, { locale });

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
