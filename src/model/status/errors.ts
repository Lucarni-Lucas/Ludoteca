import { AppError } from "@/shared/app-error";

export class StatusNotFoundError extends AppError {
  readonly code = "STATUS_NOT_FOUND";

  constructor() {
    super("No encontramos ese estado.");
  }
}
