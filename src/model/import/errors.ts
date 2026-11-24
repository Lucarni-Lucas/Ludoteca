import { AppError } from "@/shared/app-error";

/** Una opción que no está entre las de ese juego, como «Familia» sin copia de Steam. */
export class InvalidImportDecisionError extends AppError {
  readonly code = "INVALID_IMPORT_DECISION";

  constructor() {
    super("Esa opción no vale para este juego.");
  }
}

/** Ni IGN ni Playnite: no se importa nada. Un JSON roto da el mismo error. */
export class UnknownImportFileError extends AppError {
  readonly code = "UNKNOWN_IMPORT_FILE";

  constructor(options?: ErrorOptions) {
    super("No reconozco este archivo.", options);
  }
}

export class ImportFileTooLargeError extends AppError {
  readonly code = "IMPORT_FILE_TOO_LARGE";

  constructor(maxMegabytes: number) {
    super(`El archivo no puede pesar más de ${maxMegabytes} MB.`, { params: { max: maxMegabytes } });
  }
}

/** Un juego a revisar que no existe o es de otro usuario. */
export class ImportEntryNotFoundError extends AppError {
  readonly code = "IMPORT_ENTRY_NOT_FOUND";

  constructor() {
    super("No encontramos ese juego en la revisión.");
  }
}
