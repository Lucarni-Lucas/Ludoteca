// Reemplaza a Supabase Auth en los e2e: la app corre sin cambios, y se ejercitan de verdad las
// redirecciones, PKCE, las cookies y la verificación de la firma de los tokens.
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { ALLOWED_ACCOUNT, AUTH_PORT, AUTH_URL, SIGN_IN_AS_PATH } from "./constants.ts";

type Identity = { email: string; name?: string; rejectWith?: string };
type PendingCode = { identity: Identity; challenge: string; method: string };

const AUTH_PREFIX = "/auth/v1";
const TOKEN_LIFETIME_SECONDS = 3600;
const MILLISECONDS_PER_SECOND = 1000;
const KEY_ID = "e2e-signing-key";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });

let nextIdentity: Identity = ALLOWED_ACCOUNT;
const pendingCodes = new Map<string, PendingCode>();
const refreshTokens = new Map<string, Identity>();
const accessTokens = new Map<string, Identity>();

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function userIdFor(email: string): string {
  const hex = createHash("sha256").update(email).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function userMetadata({ name }: Identity): Record<string, string> {
  return name ? { full_name: name, name } : {};
}

function userFor(identity: Identity) {
  const now = new Date().toISOString();
  return {
    id: userIdFor(identity.email),
    aud: "authenticated",
    role: "authenticated",
    email: identity.email,
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: userMetadata(identity),
    identities: [],
    created_at: now,
    updated_at: now,
  };
}

function signAccessToken(identity: Identity, expiresAt: number): string {
  const header = base64url(JSON.stringify({ alg: "ES256", typ: "JWT", kid: KEY_ID }));
  const payload = base64url(
    JSON.stringify({
      iss: `${AUTH_URL}${AUTH_PREFIX}`,
      sub: userIdFor(identity.email),
      aud: "authenticated",
      role: "authenticated",
      aal: "aal1",
      exp: expiresAt,
      iat: expiresAt - TOKEN_LIFETIME_SECONDS,
      session_id: randomUUID(),
      email: identity.email,
      is_anonymous: false,
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: userMetadata(identity),
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  return `${header}.${payload}.${base64url(signature)}`;
}

function issueSession(identity: Identity) {
  const expiresAt = Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + TOKEN_LIFETIME_SECONDS;
  const accessToken = signAccessToken(identity, expiresAt);
  const refreshToken = randomUUID();
  accessTokens.set(accessToken, identity);
  refreshTokens.set(refreshToken, identity);

  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: TOKEN_LIFETIME_SECONDS,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: userFor(identity),
  };
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function sendRedirect(response: ServerResponse, location: URL): void {
  response.writeHead(302, { location: location.toString() });
  response.end();
}

async function readJson(request: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk as Uint8Array));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, string>;
}

function handleAuthorize(url: URL, response: ServerResponse): void {
  const target = new URL(url.searchParams.get("redirect_to") ?? "");

  if (nextIdentity.rejectWith) {
    target.searchParams.set("error", "server_error");
    target.searchParams.set("error_description", nextIdentity.rejectWith);
    sendRedirect(response, target);
    return;
  }

  const code = randomUUID();
  pendingCodes.set(code, {
    identity: nextIdentity,
    challenge: url.searchParams.get("code_challenge") ?? "",
    method: (url.searchParams.get("code_challenge_method") ?? "plain").toLowerCase(),
  });
  target.searchParams.set("code", code);
  sendRedirect(response, target);
}

function verifierMatches(pending: PendingCode, verifier: string): boolean {
  const computed = pending.method === "s256" ? createHash("sha256").update(verifier).digest("base64url") : verifier;
  return computed === pending.challenge;
}

function exchangePkceCode(body: Record<string, string>, response: ServerResponse): void {
  const code = body.auth_code ?? "";
  const pending = pendingCodes.get(code);
  pendingCodes.delete(code);

  if (!pending || !verifierMatches(pending, body.code_verifier ?? "")) {
    sendJson(response, 400, { code: 400, error_code: "bad_code_verifier", msg: "Código o verificador inválido" });
    return;
  }

  sendJson(response, 200, issueSession(pending.identity));
}

function refreshSession(body: Record<string, string>, response: ServerResponse): void {
  const identity = refreshTokens.get(body.refresh_token ?? "");

  if (!identity) {
    sendJson(response, 400, { code: 400, error_code: "refresh_token_not_found", msg: "Token inválido" });
    return;
  }

  sendJson(response, 200, issueSession(identity));
}

async function handleToken(url: URL, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const body = await readJson(request);
  if (url.searchParams.get("grant_type") === "pkce") {
    exchangePkceCode(body, response);
    return;
  }
  refreshSession(body, response);
}

function handleUser(request: IncomingMessage, response: ServerResponse): void {
  const token = request.headers.authorization?.replace("Bearer ", "") ?? "";
  const identity = accessTokens.get(token);

  if (identity) {
    sendJson(response, 200, userFor(identity));
    return;
  }
  sendJson(response, 401, { code: 401, error_code: "bad_jwt", msg: "Token inválido" });
}

function sendJwks(response: ServerResponse): void {
  sendJson(response, 200, {
    keys: [{ ...publicKey.export({ format: "jwk" }), kid: KEY_ID, alg: "ES256", use: "sig", key_ops: ["verify"] }],
  });
}

async function chooseAccount(request: IncomingMessage, response: ServerResponse): Promise<void> {
  nextIdentity = (await readJson(request)) as Identity;
  sendJson(response, 200, nextIdentity);
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", AUTH_URL);
  const endpoint = `${request.method} ${url.pathname.replace(AUTH_PREFIX, "")}`;

  switch (endpoint) {
    case `POST ${SIGN_IN_AS_PATH}`:
      return chooseAccount(request, response);
    case "GET /authorize":
      return handleAuthorize(url, response);
    case "POST /token":
      return handleToken(url, request, response);
    case "GET /user":
      return handleUser(request, response);
    case "GET /.well-known/jwks.json":
      return sendJwks(response);
    case "POST /logout":
      response.writeHead(204);
      response.end();
      return undefined;
    default:
      return sendJson(response, 404, { code: 404, error_code: "not_found", msg: endpoint });
  }
}

createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    sendJson(response, 500, { code: 500, msg: String(error) });
  });
}).listen(AUTH_PORT, "127.0.0.1");
