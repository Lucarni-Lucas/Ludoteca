import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImportSources, type ImportSourcesProps } from "@/components/import/ImportSources";

import { renderWithIntl } from "../../i18n/render-with-intl";

function props(overrides: Partial<ImportSourcesProps> = {}): ImportSourcesProps {
  return {
    summaries: {},
    feedback: {},
    busy: null,
    steamAccountId: null,
    steamConfigured: true,
    steamMissingMessage: "Falta configurar la clave de Steam.",
    onUpload: vi.fn(),
    onConnectSteam: vi.fn(),
    onRefreshSteam: vi.fn(),
    ...overrides,
  };
}

describe("ImportSources", () => {
  it("un archivo leído muestra «303 juegos · leído el …» y ofrece subir otro", () => {
    const summaries = { ign: { itemCount: 303, lastReadOn: "2026-11-23" } };

    renderWithIntl(<ImportSources {...props({ summaries })} />);

    const ign = screen.getByRole("article", { name: "IGN" });
    expect(ign).toHaveTextContent("303 juegos");
    expect(ign).toHaveTextContent("leído el 23 nov");
    expect(screen.getAllByRole("button", { name: "Subir otro archivo" })).toHaveLength(1);
  });

  it("subir un archivo se lo pasa a la fuente que corresponde", async () => {
    const onUpload = vi.fn();
    const file = new File(["{}"], "playnite.json", { type: "application/json" });
    renderWithIntl(<ImportSources {...props({ onUpload })} />);

    await userEvent.upload(screen.getByLabelText("Subir archivo · Playnite"), file);

    expect(onUpload).toHaveBeenCalledWith("playnite", file);
  });

  it("Archivo desconocido", () => {
    const feedback = { ign: { kind: "error" as const, message: "No reconozco este archivo. Subí el export de IGN o el de Playnite, en JSON." } };

    renderWithIntl(<ImportSources {...props({ feedback })} />);

    expect(screen.getByRole("article", { name: "IGN" })).toHaveTextContent("No reconozco este archivo");
  });

  it("Perfil privado", () => {
    const message = "Tus juegos de Steam son privados. En Steam, andá a tu perfil › Editar perfil › Privacidad y poné «Detalles del juego» como Público.";

    renderWithIntl(<ImportSources {...props({ feedback: { steam: { kind: "error", message } } })} />);

    expect(screen.getByRole("article", { name: "Steam" })).toHaveTextContent("«Detalles del juego» como Público");
  });

  it("conecta Steam con lo que se pegó en el campo", async () => {
    const onConnectSteam = vi.fn();
    renderWithIntl(<ImportSources {...props({ onConnectSteam })} />);

    await userEvent.type(screen.getByLabelText("Link de tu perfil o SteamID"), "steamcommunity.com/id/gaben");
    await userEvent.click(screen.getByRole("button", { name: "Conectar" }));

    expect(onConnectSteam).toHaveBeenCalledWith("steamcommunity.com/id/gaben");
  });

  it("con la cuenta conectada ofrece «Traer de nuevo»", async () => {
    const onRefreshSteam = vi.fn();
    const summaries = { steam: { itemCount: 412, lastReadOn: "2026-11-23" } };
    renderWithIntl(<ImportSources {...props({ steamAccountId: "76561197960287930", summaries, onRefreshSteam })} />);

    await userEvent.click(screen.getByRole("button", { name: "Traer de nuevo" }));

    expect(onRefreshSteam).toHaveBeenCalledOnce();
    expect(screen.getByRole("article", { name: "Steam" })).toHaveTextContent("412 juegos");
    expect(screen.queryByLabelText("Link de tu perfil o SteamID")).not.toBeInTheDocument();
  });

  it("sin la clave de Steam lo dice y no deja conectar", () => {
    const steamConfigured = false;

    renderWithIntl(<ImportSources {...props({ steamConfigured })} />);

    expect(screen.getByText("Falta configurar la clave de Steam.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conectar" })).toBeDisabled();
  });

  it("lleva el foco a la fuente que pidió ?source=", () => {
    const focusSource = "steam" as const;

    renderWithIntl(<ImportSources {...props({ focusSource })} />);

    expect(screen.getByLabelText("Link de tu perfil o SteamID")).toHaveFocus();
  });

  it("se ve en inglés", () => {
    const locale = "en";

    renderWithIntl(<ImportSources {...props()} />, { locale });

    expect(screen.getByRole("heading", { name: "Sources" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });
});
