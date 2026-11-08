import { describe, expect, it } from "vitest";

import { normalizeEmail } from "@/model/account/email";

import { EMAIL_NORMALIZATION_CASES } from "./email-cases";

describe("normalizeEmail", () => {
  it.each(EMAIL_NORMALIZATION_CASES)("convierte «$input» en «$normalized»", ({ input, normalized }) => {
    const email = input;

    const result = normalizeEmail(email);

    expect(result).toBe(normalized);
  });
});
