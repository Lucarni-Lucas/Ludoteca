import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoadError } from "@/components/layout/LoadError";

describe("LoadError", () => {
  it("avisa que los datos no cargaron", () => {
    const onRetry = vi.fn();

    render(<LoadError onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar tus datos. Probá de nuevo.");
  });

  it("vuelve a pedir los datos con «Reintentar»", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<LoadError onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
