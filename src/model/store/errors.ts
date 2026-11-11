import { AppError } from "@/shared/app-error";

export class StoreNotFoundError extends AppError {
  readonly code = "STORE_NOT_FOUND";

  constructor() {
    super("No encontramos esa tienda.");
  }
}

export class InvalidStoreNameError extends AppError {
  readonly code = "INVALID_STORE_NAME";

  constructor() {
    super("Escribí un nombre de tienda con letras o números.");
  }
}
