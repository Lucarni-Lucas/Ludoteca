import { AppError } from "@/shared/app-error";

export class CoverTypeNotAllowedError extends AppError {
  readonly code = "COVER_TYPE_NOT_ALLOWED";

  constructor() {
    super("La portada tiene que ser JPEG, PNG o WebP.");
  }
}

export class CoverTooLargeError extends AppError {
  readonly code = "COVER_TOO_LARGE";

  constructor() {
    super("La portada no puede pesar más de 2 MB.");
  }
}
