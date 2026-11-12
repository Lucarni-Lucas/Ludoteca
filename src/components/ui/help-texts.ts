/**
 * Los textos de la ayuda «?», tal como los pide la spec de navegación.
 * Viven juntos para que 03-idiomas los pase a los catálogos de una sola vez.
 */
export type HelpText = Readonly<{ term: string; text: string }>;

export const HELP = {
  notInterested: {
    term: "Sin interés",
    text: "Lo tenés pero no pensás jugarlo: no aparece en la biblioteca ni en los conteos. Lo ves con «Mostrar sin interés».",
  },
  releaseYear: {
    term: "Año de lanzamiento",
    text: "El año en que salió el juego, no el año en que lo conseguiste.",
  },
  family: {
    term: "Familia",
    text: "Te lo presta alguien de tu familia de Steam: lo podés jugar, pero no es tuyo.",
  },
  other: {
    term: "Otro",
    text: "Para lo que no entra en los demás tipos, como un regalo. Cuenta como tuyo.",
  },
  manual: {
    term: "A mano",
    text: "Lo cargaste vos porque no estaba en IGDB. Solo lo ves vos, y podés vincularlo con IGDB cuando quieras.",
  },
  lost: {
    term: "Ya no lo tengo",
    text: "Ya no tenés esta copia, por ejemplo porque la vendiste o terminó la suscripción. El juego conserva su estado, su puntaje y sus horas.",
  },
  endless: {
    term: "Sin fin",
    text: "Un juego que no se termina, como un multijugador: no tiene duración estimada.",
  },
} as const satisfies Readonly<Record<string, HelpText>>;
