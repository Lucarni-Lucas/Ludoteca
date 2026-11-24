import { describe, expect, it, vi } from "vitest";

import { createImportGuideService } from "@/service/import/guide-service";

describe("createImportGuideService", () => {
  it("arma el marcador de IGN con los avisos que recibe", () => {
    const buildIgnBookmarklet = vi.fn(() => "javascript:void%200");
    const messages = { wrongSite: "a", signedOut: "b", failed: "c", empty: "d" };
    const service = createImportGuideService({ buildIgnBookmarklet });

    const bookmarklet = service.ignBookmarklet(messages);

    expect(bookmarklet).toBe("javascript:void%200");
    expect(buildIgnBookmarklet).toHaveBeenCalledWith(messages);
  });
});
