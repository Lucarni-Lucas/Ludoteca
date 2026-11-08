import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readSessionUser, requireSessionUser } from "@/security/session";
import { logger } from "@/shared/logger";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
  getClaims: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/security/supabase-server", () => ({
  createSupabaseReadOnlyClient: () => Promise.resolve({ auth: { getClaims: mocks.getClaims } }),
}));

const validClaims = {
  sub: "usuario-1",
  email: "lucas@example.com",
  user_metadata: { full_name: "Lucas Lucarni" },
};

function clientReturning(result: { data: { claims: typeof validClaims } | null; error: unknown }) {
  return { getClaims: () => Promise.resolve(result) };
}

describe("readSessionUser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve el usuario cuando la sesión es válida", async () => {
    const auth = clientReturning({ data: { claims: validClaims }, error: null });

    const user = await readSessionUser(auth);

    expect(user).toEqual({ id: "usuario-1", email: "lucas@example.com", name: "Lucas Lucarni" });
  });

  it("toma el nombre del campo name cuando no hay full_name", async () => {
    const claims = { ...validClaims, user_metadata: { name: "Lucas" } };
    const auth = { getClaims: () => Promise.resolve({ data: { claims }, error: null }) };

    const user = await readSessionUser(auth);

    expect(user?.name).toBe("Lucas");
  });

  it("deja el nombre vacío cuando la cuenta no lo trae", async () => {
    const claims = { sub: "usuario-1", email: "lucas@example.com" };
    const auth = { getClaims: () => Promise.resolve({ data: { claims }, error: null }) };

    const user = await readSessionUser(auth);

    expect(user?.name).toBeNull();
  });

  it("devuelve null cuando no hay sesión", async () => {
    const auth = clientReturning({ data: null, error: null });

    const user = await readSessionUser(auth);

    expect(user).toBeNull();
  });

  it("devuelve null cuando los claims no identifican a nadie", async () => {
    const claims = { email: "lucas@example.com" };
    const auth = { getClaims: () => Promise.resolve({ data: { claims }, error: null }) };

    const user = await readSessionUser(auth);

    expect(user).toBeNull();
  });

  it("devuelve null y registra el motivo cuando getClaims falla", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const failure = new Error("firma inválida");
    const auth = clientReturning({ data: null, error: failure });

    const user = await readSessionUser(auth);

    expect(user).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.any(String), { error: failure });
  });
});

describe("requireSessionUser", () => {
  beforeEach(() => {
    mocks.redirect.mockClear();
    mocks.getClaims.mockReset();
  });

  it("devuelve el usuario cuando hay sesión", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: validClaims }, error: null });

    const user = await requireSessionUser();

    expect(user.id).toBe("usuario-1");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("manda a la pantalla de ingreso cuando no hay sesión", async () => {
    mocks.getClaims.mockResolvedValue({ data: null, error: null });

    const call = requireSessionUser();

    await expect(call).rejects.toThrow("redirect:/login");
  });
});
