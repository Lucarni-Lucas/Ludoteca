import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComingSoon } from "@/components/layout/ComingSoon";

describe("ComingSoon", () => {
  it("Sección sin construir", () => {
    const title = "Suscripciones";

    render(<ComingSoon title={title} avatarInitial="L" />);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Próximamente")).toBeInTheDocument();
  });

  it("muestra lo que la sección agrega debajo del aviso", () => {
    const invitation = "Agregá tu primer juego";

    render(
      <ComingSoon title="Biblioteca" avatarInitial="L">
        <p>{invitation}</p>
      </ComingSoon>,
    );

    expect(screen.getByText(invitation)).toBeInTheDocument();
  });
});
