import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "@/shared/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("escribe los errores con su nombre y su mensaje, que JSON perdería", () => {
    const write = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new TypeError("falló");

    logger.error("No se pudo", { error, userId: "u1" });

    expect(write).toHaveBeenCalledWith("No se pudo", {
      userId: "u1",
      error: expect.objectContaining({ name: "TypeError", message: "falló" }),
    });
  });

  it("deja igual el contexto cuando no hay error", () => {
    const write = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    logger.warn("Cuidado", { intento: 2 });

    expect(write).toHaveBeenCalledWith("Cuidado", { intento: 2 });
  });
});
