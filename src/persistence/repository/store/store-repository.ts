import { and, asc, eq, isNull, or } from "drizzle-orm";

import type { Store } from "@/model/store/store";
import type { Database } from "@/persistence/db";
import { toStore } from "@/persistence/mapper/store/store-mapper";
import { store } from "@/persistence/sql/store/store";

export type StoreRepository = Readonly<{
  listAvailable(userId: string): Promise<readonly Store[]>;
  findAvailable(userId: string, storeId: string): Promise<Store | null>;
  insertOwn(userId: string, name: string, slug: string): Promise<Store>;
}>;

/** Las tiendas conocidas (sin dueño) son la excepción a «cada consulta filtra por usuario». */
function availableTo(userId: string) {
  return or(isNull(store.userId), eq(store.userId, userId));
}

export function createStoreRepository(db: Database): StoreRepository {
  return {
    async listAvailable(userId) {
      const rows = await db.select().from(store).where(availableTo(userId)).orderBy(asc(store.name));
      return rows.map(toStore);
    },

    async findAvailable(userId, storeId) {
      const [row] = await db
        .select()
        .from(store)
        .where(and(eq(store.id, storeId), availableTo(userId)))
        .limit(1);
      return row ? toStore(row) : null;
    },

    async insertOwn(userId, name, slug) {
      // Si dos pedidos escriben la misma tienda a la vez, gana el primero y el otro la reutiliza.
      await db.insert(store).values({ userId, name, slug }).onConflictDoNothing();

      const [row] = await db
        .select()
        .from(store)
        .where(and(eq(store.userId, userId), eq(store.slug, slug)))
        .limit(1);
      return toStore(row);
    },
  };
}
