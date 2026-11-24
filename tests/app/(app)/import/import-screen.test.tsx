// @vitest-environment jsdom
// La pantalla es un componente de cliente: corre en jsdom aunque viva en tests/app (proyecto node).
import "../../../setup-dom";

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ImportScreen } from "@/app/(app)/import/import-screen";
import { buildReview } from "@/model/import/review";
import { DEFAULT_STATUSES } from "@/model/status/status";
import type { ImportOverview } from "@/service/import/import-service";

import { renderWithIntl } from "../../../i18n/render-with-intl";
import { entry, ignItem, openReview, steamItem } from "../../../model/import/import-fixtures";

const actions = vi.hoisted(() => ({
  advanceMatchingAction: vi.fn(),
  confirmImportAction: vi.fn(),
  connectSteamAction: vi.fn(),
  decideAction: vi.fn(),
  discardReviewAction: vi.fn(),
  getImportOverviewAction: vi.fn(),
  refreshSteamAction: vi.fn(),
  searchAgainAction: vi.fn(),
}));

vi.mock("@/app/(app)/import/actions", () => actions);

const STATUSES = DEFAULT_STATUSES.map((status) => ({ ...status, id: `status-${status.systemKey}` }));

const EMPTY: ImportOverview = {
  review: buildReview(openReview([]), { steamConnected: true }),
  ready: { games: 0, copies: 0 },
  sources: [],
  steam: { configured: true, accountId: "76561197960287930" },
  progress: { done: 0, total: 0 },
};

const LOADED: ImportOverview = {
  ...EMPTY,
  review: buildReview(
    openReview([entry("Beholder", [ignItem("Beholder", { ignStatuses: ["backlog"] }), steamItem("Beholder", "475550", 0)])]),
    { steamConnected: true },
  ),
  sources: [
    { source: "ign", itemCount: 303, lastReadOn: "2026-11-23" },
    { source: "steam", itemCount: 412, lastReadOn: "2026-11-23" },
  ],
  progress: { done: 2, total: 2 },
};

function renderScreen(initial: ImportOverview, expired = false) {
  renderWithIntl(<ImportScreen initial={initial} expired={expired} statuses={STATUSES} avatarInitial="L" />);
}

describe("ImportScreen", () => {
  beforeEach(() => {
    Object.values(actions).forEach((action) => action.mockReset());
    actions.discardReviewAction.mockResolvedValue({ ok: true, data: EMPTY });
  });

  it("Descartar la revisión", async () => {
    renderScreen(LOADED);

    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    const dialog = screen.getByRole("dialog", { name: "¿Empezar de nuevo?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Empezar de nuevo" }));

    expect(dialog).toHaveTextContent(
      "Se borran los archivos que subiste, lo que trajiste de Steam y lo que decidiste sin confirmar. Tu biblioteca y lo que ya importaste no cambian.",
    );
    expect(actions.discardReviewAction).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getAllByRole("status").some((status) => status.textContent === "Empezaste de nuevo: la revisión quedó vacía.")).toBe(true);
    expect(screen.queryByRole("heading", { name: "Revisión" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Subir archivo" })).toHaveLength(2);
  });

  it("cancelar «Empezar de nuevo» no borra nada", async () => {
    renderScreen(LOADED);

    await userEvent.click(screen.getByRole("button", { name: "Empezar de nuevo" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));

    expect(actions.discardReviewAction).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Revisión" })).toBeInTheDocument();
  });

  it("sin nada abierto no ofrece «Empezar de nuevo»", () => {
    renderScreen(EMPTY);

    const restart = screen.queryByRole("button", { name: "Empezar de nuevo" });

    expect(restart).not.toBeInTheDocument();
  });

  it("Revisión abandonada", () => {
    renderScreen(EMPTY, true);

    const notice = screen.getByText("Tu revisión anterior se descartó porque pasaron 7 días sin tocarla.");

    expect(notice).toHaveAttribute("role", "status");
    expect(screen.getAllByRole("button", { name: "Subir archivo" })).toHaveLength(2);
  });

  it("la cuenta de Steam conectada sin filas abiertas dice «Cuenta conectada», sin cantidad", () => {
    renderScreen(EMPTY);

    const steam = screen.getByRole("article", { name: "Steam" });

    expect(within(steam).getAllByText("Cuenta conectada").length).toBeGreaterThan(0);
    expect(within(steam).queryByText(/juegos/)).not.toBeInTheDocument();
    expect(within(steam).getByRole("button", { name: "Traer de nuevo" })).toBeInTheDocument();
  });
});
