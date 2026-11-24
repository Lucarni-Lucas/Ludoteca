import { describe, expect, it } from "vitest";

import { isSettingsPath, sectionForPath } from "@/components/layout/sections";

describe("/import en la navegación", () => {
  it.each(["/import", "/import/revision"])("%s es una opción de Ajustes", (pathname) => {
    const path = pathname;

    const settings = isSettingsPath(path);

    expect(settings).toBe(true);
  });

  it("no marca ninguna sección", () => {
    const path = "/import";

    const section = sectionForPath(path);

    expect(section).toBeNull();
  });

  it("una ruta que solo empieza igual no es Ajustes", () => {
    const path = "/importados";

    const settings = isSettingsPath(path);

    expect(settings).toBe(false);
  });
});
