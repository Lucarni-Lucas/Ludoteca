import { describe, expect, it, vi } from "vitest";

import { CoverTooLargeError, CoverTypeNotAllowedError } from "@/model/game/cover-errors";
import { MAX_COVER_BYTES } from "@/model/game/cover-upload";
import { createCoverService } from "@/service/game/cover-service";

const USER_ID = "usuario";
const FILE = { bytes: new ArrayBuffer(8), contentType: "image/png", size: 8 };

function buildService() {
  const storage = { uploadCover: vi.fn(async () => "https://example.com/portada.png") };
  const service = createCoverService({ storage, newFileId: () => "archivo" });

  return { service, storage };
}

describe("uploadCover", () => {
  it("sube a una ruta con el id del usuario y devuelve la URL", async () => {
    const { service, storage } = buildService();

    const url = await service.uploadCover(USER_ID, FILE);

    expect(url).toBe("https://example.com/portada.png");
    expect(storage.uploadCover).toHaveBeenCalledWith("usuario/archivo", FILE.bytes, "image/png");
  });

  it.each(["image/jpeg", "image/png", "image/webp"])("acepta %s", async (contentType) => {
    const { service, storage } = buildService();

    await service.uploadCover(USER_ID, { ...FILE, contentType });

    expect(storage.uploadCover).toHaveBeenCalledOnce();
  });

  it("rechaza un tipo no permitido", async () => {
    const { service, storage } = buildService();

    const upload = () => service.uploadCover(USER_ID, { ...FILE, contentType: "image/gif" });

    expect(upload).toThrow(CoverTypeNotAllowedError);
    expect(storage.uploadCover).not.toHaveBeenCalled();
  });

  it("acepta un archivo de 2 MB justos", async () => {
    const { service, storage } = buildService();

    await service.uploadCover(USER_ID, { ...FILE, size: MAX_COVER_BYTES });

    expect(storage.uploadCover).toHaveBeenCalledOnce();
  });

  it("rechaza un archivo de más de 2 MB", () => {
    const { service, storage } = buildService();

    const upload = () => service.uploadCover(USER_ID, { ...FILE, size: MAX_COVER_BYTES + 1 });

    expect(upload).toThrow(CoverTooLargeError);
    expect(storage.uploadCover).not.toHaveBeenCalled();
  });
});
