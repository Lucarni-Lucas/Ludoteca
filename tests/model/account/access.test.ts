import { describe, expect, it } from "vitest";

import { assertEmailAllowed } from "@/model/account/access";
import { EMAIL_NOT_ALLOWED_MESSAGE, EmailNotAllowedError } from "@/model/account/errors";

describe("assertEmailAllowed", () => {
  it("no hace nada cuando el mail está permitido", () => {
    const isAllowed = true;

    const assertion = () => assertEmailAllowed(isAllowed);

    expect(assertion).not.toThrow();
  });

  it("lanza EmailNotAllowedError con el mensaje para el usuario cuando no está permitido", () => {
    const isAllowed = false;

    const assertion = () => assertEmailAllowed(isAllowed);

    expect(assertion).toThrow(EmailNotAllowedError);
    expect(assertion).toThrow(EMAIL_NOT_ALLOWED_MESSAGE);
  });
});
