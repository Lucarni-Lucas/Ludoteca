// Señales de que la base no respondió o se cortó la conexión, y no de un error de la consulta.
const POOL_AND_CLIENT_MESSAGES = [
  "Query read timeout",
  "timeout exceeded when trying to connect",
  "Connection terminated",
  "Client has encountered a connection error and is not queryable",
  "Client was closed and is not queryable",
];
const NETWORK_CODES = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH"]);
// 57014 es statement_timeout; 57P0x, la base cerrándose o arrancando; 53300, sin conexiones libres.
const SERVER_CODES = new Set(["57014", "57P01", "57P02", "57P03", "53300"]);
const CONNECTION_EXCEPTION_CLASS = "08";
const MAX_CAUSE_DEPTH = 10;

function codeOf(error: Error): string {
  const { code } = error as Error & { code?: unknown };
  return typeof code === "string" ? code : "";
}

function signalsUnavailable(error: Error): boolean {
  const code = codeOf(error);

  return (
    SERVER_CODES.has(code) ||
    NETWORK_CODES.has(code) ||
    code.startsWith(CONNECTION_EXCEPTION_CLASS) ||
    POOL_AND_CLIENT_MESSAGES.some((message) => error.message.startsWith(message))
  );
}

/** Recorre la cadena de `cause`, porque Drizzle y pg envuelven el error original. */
export function isDatabaseUnavailable(error: unknown): boolean {
  let current = error;

  for (let depth = 0; current instanceof Error && depth < MAX_CAUSE_DEPTH; depth += 1) {
    if (signalsUnavailable(current)) {
      return true;
    }

    current = current.cause;
  }

  return false;
}
