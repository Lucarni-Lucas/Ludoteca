import { InvalidSteamProfileError } from "@/model/store/errors";

/** Un SteamID64 tiene 17 dígitos y empieza así: es el rango de las cuentas individuales. */
const STEAM_ID64 = /^7656119\d{10}$/;
// Los links personalizados de Steam van de 2 a 32 caracteres: letras, números, guion y guion bajo.
const VANITY_NAME = /^[\w-]{2,32}$/;
const PROTOCOL = /^https?:\/\//i;
const COMMUNITY_HOST = /^(?:www\.)?steamcommunity\.com\/(profiles|id)\/([^/?#]+)\/?(?:[?#].*)?$/i;

export type SteamAccountInput =
  | Readonly<{ kind: "steam_id"; steamId: string }>
  /** Un nombre del link personalizado: se resuelve con Steam. */
  | Readonly<{ kind: "vanity"; name: string }>;

function fromProfilePath(type: string, value: string): SteamAccountInput | null {
  if (type.toLowerCase() === "profiles") {
    return STEAM_ID64.test(value) ? { kind: "steam_id", steamId: value } : null;
  }

  return VANITY_NAME.test(value) ? { kind: "vanity", name: value } : null;
}

/** Acepta un SteamID64, el link `/profiles/` o `/id/` (con o sin `https://` y barra final) o el nombre solo. */
export function parseSteamAccount(text: string): SteamAccountInput {
  const value = text.trim();

  if (STEAM_ID64.test(value)) {
    return { kind: "steam_id", steamId: value };
  }

  const link = COMMUNITY_HOST.exec(value.replace(PROTOCOL, ""));
  const parsed = link ? fromProfilePath(link[1], link[2]) : null;

  if (parsed) {
    return parsed;
  }

  if (!link && !PROTOCOL.test(value) && VANITY_NAME.test(value)) {
    return { kind: "vanity", name: value };
  }

  throw new InvalidSteamProfileError();
}
