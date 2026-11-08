import { EMAIL_NOT_ALLOWED_MESSAGE, SIGN_IN_FAILED_MESSAGE } from "./errors";

export const SIGN_IN_ERROR_NOT_ALLOWED = "not_allowed";
export const SIGN_IN_ERROR_FAILED = "sign_in_failed";

export type SignInErrorCode = typeof SIGN_IN_ERROR_NOT_ALLOWED | typeof SIGN_IN_ERROR_FAILED;

export type SignInErrorParams = Readonly<{
  error?: string;
  errorDescription?: string;
}>;

/**
 * Lo que llega por la URL nunca se muestra tal cual: se traduce a uno de los dos mensajes propios,
 * para que un link armado no pueda escribir texto en la pantalla de ingreso.
 */
export function classifySignInError({ error, errorDescription }: SignInErrorParams): SignInErrorCode | null {
  if (!error && !errorDescription) {
    return null;
  }

  const isNotAllowed = error === SIGN_IN_ERROR_NOT_ALLOWED || errorDescription?.includes(EMAIL_NOT_ALLOWED_MESSAGE);
  return isNotAllowed ? SIGN_IN_ERROR_NOT_ALLOWED : SIGN_IN_ERROR_FAILED;
}

export function signInErrorMessage(params: SignInErrorParams): string | null {
  const code = classifySignInError(params);
  if (!code) {
    return null;
  }

  return code === SIGN_IN_ERROR_NOT_ALLOWED ? EMAIL_NOT_ALLOWED_MESSAGE : SIGN_IN_FAILED_MESSAGE;
}
