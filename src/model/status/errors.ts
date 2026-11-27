import { AppError } from "@/shared/app-error";

export class StatusNotFoundError extends AppError {
  readonly code = "STATUS_NOT_FOUND";

  constructor() {
    super("No encontramos ese estado.");
  }
}

/** «Jugado» pone la marca «Sin fin» y «Completado» la saca: el cambio se acepta en el aviso (`04` design.md §22). */
export class EndlessChangeNotAcceptedError extends AppError {
  readonly code = "ENDLESS_CHANGE_NOT_ACCEPTED";

  constructor() {
    super("Ese estado cambia la marca «Sin fin»: aceptá el aviso para guardarlo.");
  }
}
