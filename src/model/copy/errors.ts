import { MAX_KIND_DETAIL_LENGTH } from "@/model/copy/copy";
import { AppError } from "@/shared/app-error";

export class CopyNotFoundError extends AppError {
  readonly code = "COPY_NOT_FOUND";

  constructor() {
    super("No encontramos esa copia.");
  }
}

export class CopyStoreMissingError extends AppError {
  readonly code = "COPY_STORE_MISSING";

  constructor() {
    super("Elegí la tienda de cada copia");
  }
}

export class KindDetailTooLongError extends AppError {
  readonly code = "KIND_DETAIL_TOO_LONG";

  constructor() {
    super(`El detalle puede tener hasta ${MAX_KIND_DETAIL_LENGTH} caracteres`);
  }
}
