import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ImportFileTooLargeError } from "@/model/import/errors";
import { MAX_IMPORT_FILE_BYTES, MAX_IMPORT_FILE_MEGABYTES } from "@/model/import/import-row";
import { getSessionUser } from "@/security/session";
import { getImportService } from "@/service/import/instance";
import { toActionFailure, toActionResult } from "@/shared/action-result";
import { UnauthenticatedError } from "@/shared/app-error";
import { parseInput } from "@/shared/parse-input";

// Usa la base: corta mucho antes de los 300 s por defecto de Vercel.
export const maxDuration = 20;

const HTTP_UNAUTHORIZED = 401;
// Algunos navegadores mandan el JSON sin tipo, y sin tipo llega como octet-stream.
const ACCEPTED_TYPES = new Set(["application/json", "application/octet-stream", ""]);

const fileSchema = z.instanceof(File).refine((file) => ACCEPTED_TYPES.has(file.type));

/**
 * Un Route Handler y no una Server Action: las acciones tienen 1 MB de cuerpo por defecto y el export de
 * IGN ronda ese tamaño (design.md §2).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(await toActionFailure(new UnauthenticatedError()), { status: HTTP_UNAUTHORIZED });
  }

  const result = await toActionResult(async () => {
    const form = await request.formData();
    const file = parseInput(fileSchema, form.get("file"));

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      throw new ImportFileTooLargeError(MAX_IMPORT_FILE_MEGABYTES);
    }

    return getImportService().loadFile(user.id, await file.text());
  });

  return NextResponse.json(result);
}
