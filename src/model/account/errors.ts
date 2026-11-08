import { AppError } from "@/shared/app-error";

/** La función SQL del hook devuelve este mismo texto, y un test verifica que coincidan. */
export const EMAIL_NOT_ALLOWED_MESSAGE = "Esta cuenta no tiene acceso a Ludoteca";
export const EMAIL_NOT_ALLOWED_CODE = "EMAIL_NOT_ALLOWED";
export const SIGN_IN_FAILED_MESSAGE = "No pudimos iniciar sesión. Probá de nuevo.";

export class EmailNotAllowedError extends AppError {
  readonly code = EMAIL_NOT_ALLOWED_CODE;

  constructor() {
    super(EMAIL_NOT_ALLOWED_MESSAGE);
  }
}

export class SignInFailedError extends AppError {
  readonly code = "SIGN_IN_FAILED";

  constructor() {
    super(SIGN_IN_FAILED_MESSAGE);
  }
}

export class SignOutFailedError extends AppError {
  readonly code = "SIGN_OUT_FAILED";

  constructor() {
    super("No pudimos cerrar la sesión. Probá de nuevo.");
  }
}
