import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { maxDuration, POST } from "@/app/api/import/file/route";

const { getSessionUser, loadFile } = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  loadFile: vi.fn(),
}));

vi.mock("@/security/session", () => ({ getSessionUser }));
vi.mock("@/service/import/instance", () => ({ getImportService: () => ({ loadFile }) }));

const USER = { id: "usuario", email: "lucas@example.com", name: null };
const MEGABYTE = 1024 * 1024;

function upload(content: string, type = "application/json"): NextRequest {
  const form = new FormData();
  form.set("file", new File([content], "export.json", { type }));
  return new NextRequest("http://localhost/api/import/file", { method: "POST", body: form });
}

type Body = { ok: boolean; data?: unknown; error?: { code: string } };

describe("POST /api/import/file", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUser.mockResolvedValue(USER);
    loadFile.mockResolvedValue({ source: "ign", read: 303, skipped: 0 });
  });

  it("Archivo de IGN", async () => {
    const content = '{"records":[]}';

    const response = await POST(upload(content));

    expect(await response.json()).toEqual({ ok: true, data: { source: "ign", read: 303, skipped: 0 } });
    expect(loadFile).toHaveBeenCalledWith("usuario", content);
  });

  it("acepta un archivo sin tipo", async () => {
    const content = "{}";

    const response = await POST(upload(content, ""));

    expect(((await response.json()) as Body).ok).toBe(true);
  });

  it("rechaza un archivo de más de 4 MB sin leerlo", async () => {
    const content = "x".repeat(4 * MEGABYTE + 1);

    const response = await POST(upload(content));

    const body = (await response.json()) as Body;
    expect(body).toMatchObject({ ok: false, error: { code: "IMPORT_FILE_TOO_LARGE" } });
    expect(loadFile).not.toHaveBeenCalled();
  });

  it("rechaza un archivo que no es JSON", async () => {
    const content = "<html>";

    const response = await POST(upload(content, "text/html"));

    expect(((await response.json()) as Body).ok).toBe(false);
    expect(loadFile).not.toHaveBeenCalled();
  });

  it("rechaza un pedido sin archivo", async () => {
    const request = new NextRequest("http://localhost/api/import/file", { method: "POST", body: new FormData() });

    const response = await POST(request);

    expect(((await response.json()) as Body).ok).toBe(false);
    expect(loadFile).not.toHaveBeenCalled();
  });

  it("con la sesión vencida responde 401 y no importa nada", async () => {
    getSessionUser.mockResolvedValue(null);

    const response = await POST(upload("{}"));

    expect(response.status).toBe(401);
    expect(((await response.json()) as Body).error?.code).toBe("UNAUTHENTICATED");
    expect(loadFile).not.toHaveBeenCalled();
  });

  it("declara el tiempo máximo de las rutas con base", () => {
    const seconds = maxDuration;

    const declared = seconds;

    expect(declared).toBe(20);
  });
});
