import { AppError } from "@/shared/app-error";

export class IgdbUnavailableError extends AppError {
  readonly code = "IGDB_UNAVAILABLE";

  constructor() {
    super("No pudimos consultar IGDB. Probá de nuevo.");
  }
}

export class IgdbRateLimitError extends AppError {
  readonly code = "IGDB_RATE_LIMIT";

  constructor() {
    super("IGDB está recibiendo muchas consultas. Probá en unos segundos.");
  }
}

export class IgdbTimeoutError extends AppError {
  readonly code = "IGDB_TIMEOUT";

  constructor() {
    super("IGDB tardó demasiado en responder. Probá de nuevo.");
  }
}
