import { AppError } from "@/shared/app-error";

export class CopyNotFoundError extends AppError {
  readonly code = "COPY_NOT_FOUND";

  constructor() {
    super("No encontramos esa copia.");
  }
}
