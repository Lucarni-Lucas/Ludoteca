import { AppError } from "@/shared/app-error";

export class StoreNotFoundError extends AppError {
  readonly code = "STORE_NOT_FOUND";

  constructor() {
    super("No encontramos esa tienda.");
  }
}

/** Lo pegado no es un SteamID64, un link de perfil de Steam ni un nombre de perfil. */
export class InvalidSteamProfileError extends AppError {
  readonly code = "INVALID_STEAM_PROFILE";

  constructor() {
    super("Pegá el link de tu perfil de Steam o tu SteamID.");
  }
}

export class InvalidStoreNameError extends AppError {
  readonly code = "INVALID_STORE_NAME";

  constructor() {
    super("Escribí un nombre de tienda con letras o números.");
  }
}
