/** Lo que dice el marcador si no puede exportar: fuera de IGN, sin sesión, con un error o con la lista vacía. */
export type BookmarkletMessages = Readonly<{ wrongSite: string; signedOut: string; failed: string; empty: string }>;

export type ImportGuideDependencies = Readonly<{
  buildIgnBookmarklet: (messages: BookmarkletMessages) => string;
}>;

export type ImportGuideService = Readonly<{
  /** El marcador «Exportar de IGN», con sus avisos en el idioma del usuario (design.md §17). */
  ignBookmarklet(messages: BookmarkletMessages): string;
}>;

/** Las guías «¿Cómo lo saco?» no usan la base: solo arman el marcador de IGN. */
export function createImportGuideService({ buildIgnBookmarklet }: ImportGuideDependencies): ImportGuideService {
  return {
    ignBookmarklet: (messages) => buildIgnBookmarklet(messages),
  };
}
