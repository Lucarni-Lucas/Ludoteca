import { describe, expect, it } from "vitest";

import { EMAIL_NOT_ALLOWED_MESSAGE } from "@/model/account/errors";
import {
  classifySignInError,
  SIGN_IN_ERROR_FAILED,
  SIGN_IN_ERROR_NOT_ALLOWED,
} from "@/model/account/sign-in-error";

describe("classifySignInError", () => {
  it("no informa nada cuando la URL no trae un error", () => {
    const params = {};

    const code = classifySignInError(params);

    expect(code).toBeNull();
  });

  it("reconoce el código propio de mail no permitido", () => {
    const params = { error: SIGN_IN_ERROR_NOT_ALLOWED };

    const code = classifySignInError(params);

    expect(code).toBe(SIGN_IN_ERROR_NOT_ALLOWED);
  });

  it("reconoce el rechazo del hook por el texto que devuelve", () => {
    const params = { error: "server_error", errorDescription: `${EMAIL_NOT_ALLOWED_MESSAGE}.` };

    const code = classifySignInError(params);

    expect(code).toBe(SIGN_IN_ERROR_NOT_ALLOWED);
  });

  it("trata cualquier otro error como un fallo genérico", () => {
    const params = { error: "access_denied", errorDescription: "The user denied access" };

    const code = classifySignInError(params);

    expect(code).toBe(SIGN_IN_ERROR_FAILED);
  });
});

describe("el error de ingreso que se muestra", () => {
  it("devuelve null cuando no hay error", () => {
    const params = {};

    const code = classifySignInError(params);

    expect(code).toBeNull();
  });

  it("devuelve el mensaje de cuenta sin acceso", () => {
    const params = { error: SIGN_IN_ERROR_NOT_ALLOWED };

    const code = classifySignInError(params);

    expect(code).toBe(SIGN_IN_ERROR_NOT_ALLOWED);
  });

  it("nunca muestra el texto que llega por la URL", () => {
    const params = { error: "x", errorDescription: "Llamá al 0800 para recuperar tu cuenta" };

    const code = classifySignInError(params);

    expect(code).toBe(SIGN_IN_ERROR_FAILED);
  });
});
