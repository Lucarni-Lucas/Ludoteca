import type { SessionUser } from "./session-user";

const AVATAR_FALLBACK = "?";

function firstLetter(text: string | null): string | undefined {
  // Array.from separa por carácter real: un slice cortaría a la mitad un emoji o una letra compuesta.
  return Array.from(text?.trim() ?? "")[0];
}

export function avatarInitial(user: Pick<SessionUser, "name" | "email">): string {
  const letter = firstLetter(user.name) ?? firstLetter(user.email);
  return letter?.toLocaleUpperCase("es") ?? AVATAR_FALLBACK;
}
