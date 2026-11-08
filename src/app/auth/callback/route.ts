import { type NextRequest, NextResponse } from "next/server";

import { completeCodeExchange, rejectCurrentSession } from "@/security/auth";
import { getAccountService } from "@/service/account/instance";

import { resolveAuthCallback } from "./resolve-auth-callback";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const location = await resolveAuthCallback(request.nextUrl.searchParams, {
    exchangeCode: completeCodeExchange,
    ensureEmailAllowed: (email) => getAccountService().ensureEmailAllowed(email),
    rejectSession: rejectCurrentSession,
  });

  return NextResponse.redirect(new URL(location, request.url));
}
