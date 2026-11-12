import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CopyKindPicker } from "@/components/copy/CopyKindPicker";
import { HELP, type HelpText } from "@/components/ui/help-texts";
import { HelpTip } from "@/components/ui/HelpTip";
import { Toggle } from "@/components/ui/Toggle";

/** jsdom no abre popovers: se verifica que el «?» apunte al popover que tiene el texto. */
function expectHelp(term: string, text: string): void {
  const button = screen.getByRole("button", { name: `Qué es «${term}»` });
  const popover = document.getElementById(button.getAttribute("popovertarget") ?? "");

  expect(popover).toHaveAttribute("popover", "auto");
  expect(popover).toHaveTextContent(text);
}

function renderTip(help: HelpText) {
  render(<HelpTip help={help} />);
}

describe("HelpTip", () => {
  it("Ayuda de «Sin interés»", () => {
    render(<Toggle label="Mostrar sin interés" help={HELP.notInterested} checked={false} onCheckedChange={() => undefined} />);

    expectHelp(
      "Sin interés",
      "Lo tenés pero no pensás jugarlo: no aparece en la biblioteca ni en los conteos. Lo ves con «Mostrar sin interés».",
    );
  });

  it("Ayuda del año de lanzamiento", () => {
    renderTip(HELP.releaseYear);

    expectHelp("Año de lanzamiento", "El año en que salió el juego, no el año en que lo conseguiste.");
  });

  it("Ayuda de «Familia»", () => {
    render(<CopyKindPicker value="purchased" onChange={() => undefined} />);

    expectHelp("Familia", "Te lo presta alguien de tu familia de Steam: lo podés jugar, pero no es tuyo.");
  });

  it("Ayuda de «Otro»", () => {
    render(<CopyKindPicker value="purchased" onChange={() => undefined} />);

    expectHelp("Otro", "Para lo que no entra en los demás tipos, como un regalo. Cuenta como tuyo.");
  });

  it("Ayuda de «A mano»", () => {
    renderTip(HELP.manual);

    expectHelp(
      "A mano",
      "Lo cargaste vos porque no estaba en IGDB. Solo lo ves vos, y podés vincularlo con IGDB cuando quieras.",
    );
  });

  it("Ayuda de «Ya no lo tengo»", () => {
    renderTip(HELP.lost);

    expectHelp(
      "Ya no lo tengo",
      "Ya no tenés esta copia, por ejemplo porque la vendiste o terminó la suscripción. El juego conserva su estado, su puntaje y sus horas.",
    );
  });

  it("Ayuda de «Sin fin»", () => {
    renderTip(HELP.endless);

    expectHelp("Sin fin", "Un juego que no se termina, como un multijugador: no tiene duración estimada.");
  });

  it("cada «?» abre su propio texto aunque haya varios en la pantalla", () => {
    render(
      <>
        <HelpTip help={HELP.family} />
        <HelpTip help={HELP.other} />
      </>,
    );

    const targets = screen.getAllByRole("button").map((button) => button.getAttribute("popovertarget"));

    expect(new Set(targets).size).toBe(2);
  });

  it("los tipos sin término propio no llevan «?»", () => {
    render(<CopyKindPicker value="purchased" onChange={() => undefined} />);

    const helpButtons = screen.getAllByRole("button", { name: /^Qué es/ });

    expect(helpButtons).toHaveLength(2);
  });
});
