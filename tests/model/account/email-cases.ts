/** Compartidos por el test del modelo y el de la función SQL del hook: las dos normalizaciones deben coincidir. */
export const EMAIL_NORMALIZATION_CASES = [
  { input: "lucas@example.com", normalized: "lucas@example.com" },
  { input: "Lucas@Example.COM", normalized: "lucas@example.com" },
  { input: "  lucas@example.com  ", normalized: "lucas@example.com" },
  { input: "\tLUCAS@example.com\n", normalized: "lucas@example.com" },
] as const;
