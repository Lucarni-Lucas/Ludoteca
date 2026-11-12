import { AppError } from "@/shared/app-error";

export class GameNotFoundError extends AppError {
  readonly code = "GAME_NOT_FOUND";

  constructor() {
    super("No encontramos este juego.");
  }
}

export class ScoreOutOfRangeError extends AppError {
  readonly code = "SCORE_OUT_OF_RANGE";

  constructor() {
    super("El puntaje va de 0.0 a 10.0.");
  }
}

export class GameAlreadyInLibraryError extends AppError {
  readonly code = "GAME_ALREADY_IN_LIBRARY";

  constructor() {
    super("Ese juego ya está en tu biblioteca.");
  }
}

export class GameNotManualError extends AppError {
  readonly code = "GAME_NOT_MANUAL";

  constructor() {
    super("Solo se puede vincular un juego cargado a mano.");
  }
}

export class GameNotFromIgdbError extends AppError {
  readonly code = "GAME_NOT_FROM_IGDB";

  constructor() {
    super("Este juego no viene de IGDB.");
  }
}

export class PlayedHoursOutOfRangeError extends AppError {
  readonly code = "PLAYED_HOURS_OUT_OF_RANGE";

  constructor() {
    super("Poné las horas jugadas, de 0 en adelante");
  }
}

export class ReleaseYearOutOfRangeError extends AppError {
  readonly code = "RELEASE_YEAR_OUT_OF_RANGE";

  constructor(range: Readonly<{ min: number; max: number }>) {
    super(`Poné un año entre ${range.min} y ${range.max}`);
  }
}
