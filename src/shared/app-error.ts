// Symbol.for comparte la marca entre todas las copias de este módulo.
const APP_ERROR_BRAND = Symbol.for("ludoteca.app-error");

/** Las variables del texto que ve el usuario, como `{ min: 1950, max: 2027 }`. */
export type ErrorParams = Readonly<Record<string, string | number>>;

export type AppErrorOptions = ErrorOptions & Readonly<{ params?: ErrorParams; messageKey?: string }>;

/**
 * Error esperado de la aplicación. Lo que ve el usuario sale del catálogo, en `errors.<code>` con sus
 * `params` o en la clave propia que indique; el `message` queda como descripción interna para el log.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly params: ErrorParams;
  /** Una clave del catálogo distinta de `errors.<code>`, como las de `validation`. */
  readonly messageKey: string | null;
  readonly [APP_ERROR_BRAND] = true;

  protected constructor(message: string, { params = {}, messageKey, ...options }: AppErrorOptions = {}) {
    super(message, options);
    this.name = new.target.name;
    this.params = params;
    this.messageKey = messageKey ?? null;
  }
}

/**
 * Next carga este módulo una vez por bundle, y un error creado en otro (como los del pool de la base,
 * que es uno solo para todo el proceso) no pasa `instanceof AppError`. Por eso se reconoce por la marca.
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof Error && (value as Error & { [APP_ERROR_BRAND]?: unknown })[APP_ERROR_BRAND] === true;
}

const MAX_CAUSE_DEPTH = 10;

/** Drizzle envuelve en `DrizzleQueryError` lo que tira el driver: el error de la app puede estar adentro. */
export function findAppError(error: unknown): AppError | null {
  let current = error;

  for (let depth = 0; current instanceof Error && depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (isAppError(current)) {
      return current;
    }

    current = current.cause;
  }

  return null;
}

export const DATABASE_UNAVAILABLE_CODE = "DATABASE_UNAVAILABLE";
export const INTERNAL_ERROR_CODE = "INTERNAL_ERROR";

/** Sin clave de `validation`, el usuario ve el texto genérico de `errors.INVALID_REQUEST`. */
export class InvalidRequestError extends AppError {
  readonly code = "INVALID_REQUEST";
  readonly validationKey: string | null;

  constructor(validationKey?: string) {
    super(validationKey ? `Pedido inválido: ${validationKey}` : "El pedido no es válido.", {
      messageKey: validationKey ? `validation.${validationKey}` : undefined,
    });
    this.validationKey = validationKey ?? null;
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
