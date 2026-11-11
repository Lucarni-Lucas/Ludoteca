import { AppError } from "@/shared/app-error";

export class CoverUploadFailedError extends AppError {
  readonly code = "COVER_UPLOAD_FAILED";

  constructor() {
    super("No pudimos subir la imagen. Probá de nuevo.");
  }
}
