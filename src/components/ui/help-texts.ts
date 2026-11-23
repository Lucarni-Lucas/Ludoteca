/**
 * Los temas de la ayuda «?». Sus textos viven en el catálogo, en `help.<tema>.term` y `help.<tema>.text`;
 * acá solo queda la lista, para que un tema mal escrito no compile.
 */
export const HELP = {
  notInterested: "notInterested",
  releaseYear: "releaseYear",
  duration: "duration",
  family: "family",
  other: "other",
  manual: "manual",
  lost: "lost",
  endless: "endless",
} as const;

export type HelpText = (typeof HELP)[keyof typeof HELP];
