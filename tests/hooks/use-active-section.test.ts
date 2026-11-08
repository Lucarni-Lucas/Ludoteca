import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useActiveSection } from "@/hooks/use-active-section";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("useActiveSection", () => {
  it("devuelve la sección de la ruta actual", () => {
    pathname.current = "/stores";

    const { result } = renderHook(() => useActiveSection());

    expect(result.current).toEqual({ section: "stores", isSettings: false });
  });

  it("indica cuando el usuario está en Ajustes", () => {
    pathname.current = "/settings/account";

    const { result } = renderHook(() => useActiveSection());

    expect(result.current).toEqual({ section: null, isSettings: true });
  });
});
