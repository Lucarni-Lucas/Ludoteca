import type { Store } from "@/model/store/store";
import type { store } from "@/persistence/sql/store/store";

export function toStore(row: typeof store.$inferSelect): Store {
  return { id: row.id, name: row.name, slug: row.slug };
}
