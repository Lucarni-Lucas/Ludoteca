import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/igdb/search/route";

const { getSessionUser, search } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@/security/session", () => ({ getSessionUser }));
vi.mock("@/service/game/instance", () => ({ getCatalogService: () => ({ search }) }));

const USER = { id: "usuario", email: "lucas@example.com", name: null };

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/igdb/search${query}`);
}

describe("GET /api/igdb/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue(USER);
    search.mockResolvedValue([]);
  });

  it("rechaza un pedido sin sesión y no consulta IGDB", async () => {
    getSessionUser.mockResolvedValue(null);

    const response = await GET(request("?q=hades"));

    expect(response.status).toBe(401);
    expect(search).not.toHaveBeenCalled();
  });

  it("busca con el usuario de la sesión y el texto sin espacios", async () => {
    const results = [{ igdbId: 1, title: "Hades" }];
    search.mockResolvedValue(results);

    const response = await GET(request("?q=%20hades%20"));

    expect(await response.json()).toEqual({ ok: true, data: results });
    expect(search.mock.calls[0].slice(0, 2)).toEqual(["usuario", "hades"]);
  });

  it.each(["", "?q=", "?q=h"])("no busca con «%s»", async (query) => {
    const value = query;

    const response = await GET(request(value));

    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(false);
    expect(search).not.toHaveBeenCalled();
  });
});
