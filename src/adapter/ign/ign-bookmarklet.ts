/**
 * El marcador «Exportar de IGN» (design.md §17). Corre en la pestaña de www.ign.com, pide la biblioteca a la
 * API de IGN con la sesión que ya tiene el navegador y descarga un archivo con el formato que lee
 * `readIgnExport`. No manda nada a Ludoteca ni a terceros: el único destino es la API de IGN.
 *
 * `exportIgnLibrary` se convierte en texto para el `javascript:` del marcador, así que no puede usar imports ni
 * nada de fuera de su cuerpo: todo lo que necesita está adentro o llega por `deps`.
 */

/** Los textos del marcador, en el idioma del usuario: salen de los catálogos al armar la guía. */
export type BookmarkletMessages = Readonly<{
  wrongSite: string;
  signedOut: string;
  failed: string;
  empty: string;
}>;

/** Lo que el marcador toma del navegador; en los tests se reemplaza por dobles. */
export type BookmarkletDeps = Readonly<{
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  hostname: string;
  now: () => string;
  download: (fileName: string, text: string) => void;
  alert: (message: string) => void;
  messages: BookmarkletMessages;
}>;

export const IGN_API_URL = "https://mollusk.apis.ign.com/graphql";
export const IGN_EXPORT_FILE_NAME = "ign-export.json";

export async function exportIgnLibrary(deps: BookmarkletDeps): Promise<void> {
  const API_URL = "https://mollusk.apis.ign.com/graphql";
  const FILE_NAME = "ign-export.json";
  const IGN_HOST = "ign.com";
  const PAGE_SIZE = 100;
  const REVIEWS_PER_REQUEST = 100;
  const SECONDS_PER_HOUR = 3600;
  const HOUR_DECIMALS = 10;
  const YEAR_LENGTH = 4;
  const NO_ITCH_ID = "0";
  // El orden decide el `status` cuando hay más de una marca, como en el export que ya se leía.
  const FLAGS = ["playing", "completed", "archived", "paused", "wishlist", "backlog"];
  const STATUS_OF_FLAG: Record<string, string> = { completed: "beat", archived: "quit" };
  const LIBRARY_QUERY = `query LudotecaLibrary($cursor: Cursor, $count: Int) {
  searchLibrary(sortBy: "object.name", sortOrder: "asc", region: "us", cursor: $cursor, count: $count) {
    pageInfo { hasNext nextCursor total }
    libraryObjects { objectId playing completed archived paused wishlist backlog createdAt updatedAt
      platforms { name }
      object { slug metadata { names { name alt } } producers { name }
        objectRegions { releases { date } }
        hl2bData } }
  }
}`;
  const REVIEWS_QUERY = `query LudotecaReviews($objectIds: [ID!]!) {
  usersReviewsByObjectIds(objectIds: $objectIds) { objectId score text createdAt }
}`;

  type Json = Record<string, unknown>;

  class SignedOutError extends Error {}

  function asObject(value: unknown): Json {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
  }

  function asArray(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  function asText(value: unknown): string | null {
    return typeof value === "string" && value !== "" ? value : null;
  }

  function names(list: unknown): string[] {
    return asArray(list).flatMap((item) => {
      const name = asText(asObject(item).name);
      return name ? [name] : [];
    });
  }

  async function ask(query: string, variables: Json): Promise<Json> {
    const response = await deps.fetch(API_URL, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const body = asObject(await response.json());

    // Sin sesión, IGN contesta con `errors`: mejor avisar que bajar un archivo vacío.
    if (!response.ok || asArray(body.errors).length > 0 || !body.data) {
      throw new SignedOutError();
    }

    return asObject(body.data);
  }

  async function loadLibrary(): Promise<{ objects: Json[]; total: number }> {
    const objects: Json[] = [];
    let cursor: unknown = null;
    let total = 0;

    for (;;) {
      const library = asObject((await ask(LIBRARY_QUERY, { cursor, count: PAGE_SIZE })).searchLibrary);
      const page = asObject(library.pageInfo);
      objects.push(...asArray(library.libraryObjects).map(asObject));
      total = typeof page.total === "number" ? page.total : objects.length;

      // Si la página no avanza, se corta: una respuesta rara no deja el marcador pidiendo para siempre.
      if (page.hasNext !== true || page.nextCursor == null || page.nextCursor === cursor) {
        return { objects, total };
      }

      cursor = page.nextCursor;
    }
  }

  async function loadReviews(ids: string[]): Promise<Map<string, Json>> {
    const reviews = new Map<string, Json>();

    for (let start = 0; start < ids.length; start += REVIEWS_PER_REQUEST) {
      const objectIds = ids.slice(start, start + REVIEWS_PER_REQUEST);
      const data = await ask(REVIEWS_QUERY, { objectIds });
      asArray(data.usersReviewsByObjectIds).forEach((value) => {
        const review = asObject(value);
        const id = asText(review.objectId);
        if (id) {
          reviews.set(id, review);
        }
      });
    }

    return reviews;
  }

  function hours(seconds: unknown): number | null {
    return typeof seconds === "number" && seconds > 0 ? Math.round((seconds / SECONDS_PER_HOUR) * HOUR_DECIMALS) / HOUR_DECIMALS : null;
  }

  /** `hl2bData` es un escalar JSON: puede llegar como objeto o como texto. */
  function howLongToBeat(value: unknown): Json {
    if (typeof value !== "string") {
      return asObject(value);
    }

    try {
      return asObject(JSON.parse(value));
    } catch {
      // Un texto que no es JSON es lo mismo que no tener datos de HowLongToBeat.
      return {};
    }
  }

  function hltbOf(data: Json): (number | null)[] | null {
    const time = asObject(data.time);
    const values = [hours(time.main), hours(time.main_plus), hours(time.completionist)];
    return values.some((value) => value !== null) ? values : null;
  }

  function steamIdOf(value: unknown): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function itchIdOf(value: unknown): string | null {
    const id = value == null ? null : String(value);
    return id === null || id === "" || id === NO_ITCH_ID ? null : id;
  }

  /** El año de la fecha más vieja entre todos los lanzamientos de todas las regiones. */
  function yearOf(object: Json): number | null {
    const years = asArray(object.objectRegions).flatMap((region) =>
      asArray(asObject(region).releases).flatMap((release) => {
        const year = Number(String(asObject(release).date ?? "").slice(0, YEAR_LENGTH));
        return Number.isInteger(year) && year > 0 ? [year] : [];
      }),
    );
    return years.length > 0 ? Math.min(...years) : null;
  }

  function altOf(value: unknown): string[] {
    if (typeof value === "string") {
      return value === "" ? [] : [value];
    }

    return asArray(value).flatMap((alt) => (typeof alt === "string" && alt !== "" ? [alt] : []));
  }

  function recordOf(item: Json, review: Json | undefined): Json {
    const object = asObject(item.object);
    const gameNames = asObject(asObject(object.metadata).names);
    const flags = FLAGS.filter((flag) => item[flag] === true);
    const hltb = howLongToBeat(object.hl2bData);
    const score = review && typeof review.score === "number" ? review.score : null;

    return {
      ignId: asText(item.objectId),
      slug: asText(object.slug),
      name: asText(gameNames.name),
      alt: altOf(gameNames.alt),
      dev: names(object.producers),
      flags,
      status: flags.length > 0 ? (STATUS_OF_FLAG[flags[0]] ?? flags[0]) : null,
      hltb: hltbOf(hltb),
      steamId: steamIdOf(hltb.steam_id),
      itchId: itchIdOf(hltb.itch_id),
      year: yearOf(object),
      platforms: names(item.platforms),
      added: asText(item.createdAt),
      updated: asText(item.updatedAt),
      score,
      scoredAt: score === null ? null : asText(review?.createdAt),
      review: score === null ? null : asText(review?.text),
    };
  }

  if (deps.hostname !== IGN_HOST && !deps.hostname.endsWith(`.${IGN_HOST}`)) {
    deps.alert(deps.messages.wrongSite);
    return;
  }

  try {
    const { objects, total } = await loadLibrary();
    const ids = objects.flatMap((item) => {
      const id = asText(item.objectId);
      return id ? [id] : [];
    });

    if (ids.length === 0) {
      deps.alert(deps.messages.empty);
      return;
    }

    const reviews = await loadReviews(ids);
    const records = objects.map((item) => recordOf(item, reviews.get(String(item.objectId))));
    const content = {
      exportedAt: deps.now(),
      total,
      count: records.length,
      withScore: records.filter((record) => record.score !== null).length,
      errors: [],
      records,
    };
    deps.download(FILE_NAME, JSON.stringify(content, null, 1));
  } catch (error) {
    deps.alert(error instanceof SignedOutError ? deps.messages.signedOut : deps.messages.failed);
  }
}

/**
 * Lo que el marcador pone alrededor de `exportIgnLibrary`: el navegador de verdad y la descarga con un `Blob`.
 * También es texto: corre en la pestaña de IGN, no en Ludoteca.
 */
function browserDeps(messages: BookmarkletMessages): BookmarkletDeps {
  return {
    fetch: (url, init) => window.fetch(url, init),
    hostname: window.location.hostname,
    now: () => new Date().toISOString(),
    download(fileName, text) {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    alert: (message) => window.alert(message),
    messages,
  };
}

/** El `javascript:…` del marcador, con los textos ya puestos en el idioma del usuario. */
export function buildIgnBookmarklet(messages: BookmarkletMessages): string {
  const deps = `(${browserDeps.toString()})(${JSON.stringify(messages)})`;
  const source = `void (${exportIgnLibrary.toString()})(${deps});`;
  // Un marcador es código que el usuario corre en IGN a propósito: es lo que pide la guía (design.md §17).
  // eslint-disable-next-line sonarjs/code-eval
  return `javascript:${encodeURIComponent(source)}`;
}
