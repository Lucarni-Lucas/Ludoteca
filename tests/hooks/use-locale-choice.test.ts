import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type ChooseLocaleAction, useLocaleChoice } from "@/hooks/use-locale-choice";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));

const failure = { ok: false, error: { code: "DATABASE_UNAVAILABLE", message: "No pudimos guardar el cambio." } } as const;

describe("useLocaleChoice", () => {
  it("Pasar a inglés", async () => {
    router.refresh.mockClear();
    const action = vi.fn<ChooseLocaleAction>().mockResolvedValue({ ok: true, data: "updated" });
    const { result } = renderHook(() => useLocaleChoice(action));

    await act(() => result.current.choose("en"));

    expect(action).toHaveBeenCalledWith("en");
    expect(router.refresh).toHaveBeenCalledOnce();
    await waitFor(() => expect(result.current.change).toBe("updated"));
  });

  it("Volver al español", async () => {
    router.refresh.mockClear();
    const action = vi.fn<ChooseLocaleAction>().mockResolvedValue({ ok: true, data: "updated" });
    const { result } = renderHook(() => useLocaleChoice(action));

    await act(() => result.current.choose("es"));

    expect(action).toHaveBeenCalledWith("es");
    await waitFor(() => expect(result.current.change).toBe("updated"));
  });

  it("avisa que no cambió nada al elegir el idioma que ya estaba", async () => {
    const action = vi.fn<ChooseLocaleAction>().mockResolvedValue({ ok: true, data: "unchanged" });
    const { result } = renderHook(() => useLocaleChoice(action));

    await act(() => result.current.choose("es"));

    await waitFor(() => expect(result.current.change).toBe("unchanged"));
  });

  it("muestra el error y no refresca cuando no se pudo guardar", async () => {
    router.refresh.mockClear();
    const action = vi.fn<ChooseLocaleAction>().mockResolvedValue(failure);
    const { result } = renderHook(() => useLocaleChoice(action));

    await act(() => result.current.choose("en"));

    expect(result.current.errorMessage).toBe(failure.error.message);
    expect(result.current.change).toBeNull();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
