import type { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/security/update-session";

export function proxy(request: NextRequest): Promise<NextResponse> {
  return updateSession(request);
}

export const config = {
  // Afuera solo los archivos estáticos: cualquier pantalla o acción nueva queda cubierta sin tocar esto.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
