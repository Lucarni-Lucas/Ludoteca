/**
 * Error esperado de la aplicación. Su `message` llega al usuario, así que va en español
 * y no puede incluir detalles internos.
 */
export abstract class AppError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidRequestError extends AppError {
  readonly code = "INVALID_REQUEST";

  constructor(message = "El pedido no es válido.") {
    super(message);
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = "UNAUTHENTICATED";

  constructor(message = "Tenés que ingresar para hacer esto.") {
    super(message);
  }
}
