// Symbol.for comparte la marca entre todas las copias de este módulo.
const APP_ERROR_BRAND = Symbol.for("ludoteca.app-error");

/**
 * Error esperado de la aplicación. Su `message` llega al usuario, así que va en español
 * y no puede incluir detalles internos.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly [APP_ERROR_BRAND] = true;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

/**
 * Next carga este módulo una vez por bundle, y un error creado en otro (como los del pool de la base,
 * que es uno solo para todo el proceso) no pasa `instanceof AppError`. Por eso se reconoce por la marca.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof Error && (value as Error & { [APP_ERROR_BRAND]?: unknown })[APP_ERROR_BRAND] === true;
}

export const DATABASE_UNAVAILABLE_CODE = "DATABASE_UNAVAILABLE";

export class InvalidRequestError extends AppError {
  readonly code = "INVALID_REQUEST";

  constructor(message = "El pedido no es válido.") {
    super(message);
  }
}

/** La base no respondió a tiempo o se cortó la conexión: el usuario puede reintentar. */
export class DatabaseUnavailableError extends AppError {
  readonly code = DATABASE_UNAVAILABLE_CODE;

  constructor(options?: ErrorOptions) {
    super("No pudimos guardar el cambio. Probá de nuevo.", options);
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Tenés que ingresar para hacer esto.") {
    super(message);
  }
}
