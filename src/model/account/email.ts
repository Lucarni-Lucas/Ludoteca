/** Los mismos casos se verifican contra la función SQL del hook, que normaliza por su cuenta. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
