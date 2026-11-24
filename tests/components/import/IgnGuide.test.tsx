import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { IgnGuide } from "@/components/import/IgnGuide";

import { renderWithIntl } from "../../i18n/render-with-intl";

const BOOKMARKLET = "javascript:void%20(alert(1))";

describe("IgnGuide", () => {
  it("Aviso de que puede fallar", () => {
    renderWithIntl(<IgnGuide bookmarklet={BOOKMARKLET} />);

    const warning = screen.getByText(/El marcador depende de cómo arma IGN su página/);

    expect(warning).toHaveTextContent(
      "El marcador depende de cómo arma IGN su página. Si IGN la cambia, puede dejar de andar: avisanos y lo arreglamos.",
    );
  });

  it("muestra los cuatro pasos, del marcador a subir el archivo", () => {
    renderWithIntl(<IgnGuide bookmarklet={BOOKMARKLET} />);

    const steps = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(screen.getByRole("heading", { level: 1, name: "¿Cómo saco mi lista de IGN?" })).toBeInTheDocument();
    expect(steps).toHaveLength(4);
    expect(steps[2]).toHaveTextContent("Tocá el marcador «Exportar de IGN». Tu navegador descarga ign-export.json.");
    expect(steps[3]).toHaveTextContent("Volvé a Importar y subí el archivo en IGN.");
  });

  it("el link del marcador tiene el javascript: puesto", () => {
    renderWithIntl(<IgnGuide bookmarklet={BOOKMARKLET} />);

    const link = screen.getByText("Exportar de IGN").closest("a");

    expect(link).toHaveAttribute("href", BOOKMARKLET);
    expect(link).toHaveAttribute("draggable", "true");
  });

  it("tocarlo dentro de Ludoteca no lo corre: explica que se usa desde IGN", async () => {
    renderWithIntl(<IgnGuide bookmarklet={BOOKMARKLET} />);

    await userEvent.click(screen.getByText("Exportar de IGN"));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Este botón se usa desde IGN: arrastralo a tu barra de favoritos y tocalo con tu lista de IGN abierta.",
    );
  });

  it("se ve en inglés", () => {
    renderWithIntl(<IgnGuide bookmarklet={BOOKMARKLET} />, { locale: "en" });

    const title = screen.getByRole("heading", { level: 1 });

    expect(title).toHaveTextContent("How do I get my IGN list?");
    expect(screen.getByText("Export from IGN")).toBeInTheDocument();
  });
});
