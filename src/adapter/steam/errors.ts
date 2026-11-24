import { AppError } from "@/shared/app-error";

export class SteamNotConfiguredError extends AppError {
  readonly code = "STEAM_NOT_CONFIGURED";

  constructor() {
    super("Falta configurar la clave de Steam.");
  }
}

export class SteamProfileNotFoundError extends AppError {
  readonly code = "STEAM_PROFILE_NOT_FOUND";

  constructor() {
    super("No encontramos ese perfil de Steam.");
  }
}

/** Steam responde sin `game_count` cuando los detalles de juego del perfil no son públicos (design.md §6). */
export class SteamGamesPrivateError extends AppError {
  readonly code = "STEAM_GAMES_PRIVATE";

  constructor() {
    super("Los juegos de ese perfil son privados.");
  }
}

export class SteamUnavailableError extends AppError {
  readonly code = "STEAM_UNAVAILABLE";

  constructor() {
    super("No pudimos consultar Steam. Probá de nuevo.");
  }
}

export class SteamTimeoutError extends AppError {
  readonly code = "STEAM_TIMEOUT";

  constructor() {
    super("Steam tardó demasiado en responder. Probá de nuevo.");
  }
}
