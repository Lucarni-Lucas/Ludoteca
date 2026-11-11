import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { CoverUploadFailedError } from "@/adapter/supabase-storage/errors";
import { createStorageAdapter } from "@/adapter/supabase-storage/storage-adapter";
import { logger } from "@/shared/logger";

const SUPABASE_URL = "https://proyecto.supabase.test";
const ENV = { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SECRET_KEY: "sb_secret_abc" };
const OBJECT_URL = `${SUPABASE_URL}/storage/v1/object/covers/usuario/archivo`;
const BYTES = new TextEncoder().encode("imagen").buffer as ArrayBuffer;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
  vi.spyOn(logger, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
  vi.restoreAllMocks();
});

describe("createStorageAdapter", () => {
  it("sube la portada con la secret key y devuelve la URL pública", async () => {
    const seen: Array<string | null> = [];
    server.use(
      http.post(OBJECT_URL, ({ request }) => {
        seen.push(request.headers.get("Authorization"));
        return HttpResponse.json({ Key: "covers/usuario/archivo" });
      }),
    );

    const url = await createStorageAdapter(() => ENV).uploadCover("usuario/archivo", BYTES, "image/png");

    expect(seen).toEqual(["Bearer sb_secret_abc"]);
    expect(url).toBe(`${SUPABASE_URL}/storage/v1/object/public/covers/usuario/archivo`);
  });

  it("convierte un error del proveedor en un error propio", async () => {
    server.use(http.post(OBJECT_URL, () => HttpResponse.json({ message: "bucket not found" }, { status: 404 })));

    const upload = createStorageAdapter(() => ENV).uploadCover("usuario/archivo", BYTES, "image/png");

    await expect(upload).rejects.toBeInstanceOf(CoverUploadFailedError);
  });

  it("no lee las credenciales hasta el primer uso", () => {
    const getEnv = vi.fn(() => ENV);

    createStorageAdapter(getEnv);

    expect(getEnv).not.toHaveBeenCalled();
  });
});
