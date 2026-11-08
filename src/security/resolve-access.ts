import { DEFAULT_SIGNED_IN_PATH } from "@/model/account/next-path";

const LOGIN_PATH = "/login";
const AUTH_CALLBACK_PATH = "/auth/callback";

export type AccessRequest = Readonly<{
  pathname: string;
  search: string;
  hasSession: boolean;
}>;

export type AccessDecision = Readonly<{ action: "allow" }> | Readonly<{ action: "redirect"; location: string }>;

const ALLOW: AccessDecision = { action: "allow" };

function loginRedirect(pathname: string, search: string): AccessDecision {
  const next = encodeURIComponent(`${pathname}${search}`);
  return { action: "redirect", location: `${LOGIN_PATH}?next=${next}` };
}

export function resolveAccess({ pathname, search, hasSession }: AccessRequest): AccessDecision {
  if (pathname === AUTH_CALLBACK_PATH) {
    return ALLOW;
  }

  if (pathname === LOGIN_PATH) {
    return hasSession ? { action: "redirect", location: DEFAULT_SIGNED_IN_PATH } : ALLOW;
  }

  return hasSession ? ALLOW : loginRedirect(pathname, search);
}
