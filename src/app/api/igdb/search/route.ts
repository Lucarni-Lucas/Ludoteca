import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/security/session";
import { getCatalogService } from "@/service/game/instance";
import { toActionResult } from "@/shared/action-result";
import { parseInput } from "@/shared/parse-input";

// Usa la base: corta mucho antes de los 300 s por defecto de Vercel (design.md §17).
export const maxDuration = 20;

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const HTTP_UNAUTHORIZED = 401;

const querySchema = z.string().trim().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH);

/** Un GET y no una Server Action: las acciones van en serie y no se pueden cancelar mientras se escribe. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Tenés que ingresar." } }, {
      status: HTTP_UNAUTHORIZED,
    });
  }

  const result = await toActionResult(() => {
    const text = parseInput(querySchema, request.nextUrl.searchParams.get("q"));
    return getCatalogService().search(user.id, text, request.signal);
  });

  return NextResponse.json(result);
}
