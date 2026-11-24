import { describe, expect, it } from "vitest";

import { isReviewExpired, REVIEW_EXPIRY_DAYS } from "@/model/import/expiry";

describe("isReviewExpired", () => {
  it("vence a los 8 días sin tocarla", () => {
    const lastActivity = "2026-11-16";

    const expired = isReviewExpired(lastActivity, "2026-11-24");

    expect(expired).toBe(true);
  });

  it("a los 7 días todavía sigue", () => {
    const lastActivity = "2026-11-17";

    const expired = isReviewExpired(lastActivity, "2026-11-24");

    expect(REVIEW_EXPIRY_DAYS).toBe(7);
    expect(expired).toBe(false);
  });

  it("el mismo día no vence", () => {
    const today = "2026-11-24";

    const expired = isReviewExpired(today, today);

    expect(expired).toBe(false);
  });

  it("cuenta días de calendario a través de un cambio de mes y de año", () => {
    const lastActivity = "2026-12-28";

    const results = [isReviewExpired(lastActivity, "2027-01-04"), isReviewExpired(lastActivity, "2027-01-05")];

    expect(results).toEqual([false, true]);
  });
});
