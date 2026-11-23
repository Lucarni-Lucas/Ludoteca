import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IgdbRateLimitError } from "@/adapter/igdb/errors";
import { GET } from "@/app/api/igdb/search/route";

const { getSessionUser, search } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  search: vi.fn(),
}));

vi.mock("@/security/session", () => ({ getSessionUser }));
vi.mock("@/service/game/instance", () => ({ getCatalogService: () => ({ search }) }));
vi.mock("@/i18n/locale", () => ({ getRequestLocale: async () => "en" }));

const USER = { id: "usuario", email: "lucas@example.com", name: null };

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/igdb/search${query}`);
}

describe("GET /api/igdb/search en inglés", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue(USER);
  });

  it("avisa en inglés que la sesión venció", async () => {
    getSessionUser.mockResolvedValue(null);

    const response = await GET(request("?q=hades"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: "You need to sign in to do this." },
    });
  });

  it("traduce el error del adapter al inglés", async () => {
    search.mockRejectedValue(new IgdbRateLimitError());

    const response = await GET(request("?q=hades"));

    expect(await response.json()).toEqual({
      ok: false,
      error: { code: "IGDB_RATE_LIMIT", message: "IGDB is getting too many requests. Try again in a few seconds." },
    });
  });
});
