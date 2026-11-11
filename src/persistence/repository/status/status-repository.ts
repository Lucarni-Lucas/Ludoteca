import { and, eq } from "drizzle-orm";

import type { DefaultStatus, Status } from "@/model/status/status";
import type { Database } from "@/persistence/db";
import { toNewStatusRow, toStatus } from "@/persistence/mapper/status/status-mapper";
import { status } from "@/persistence/sql/status/status";

export type StatusRepository = Readonly<{
  listByUser(userId: string): Promise<readonly Status[]>;
  findById(userId: string, statusId: string): Promise<Status | null>;
  insertDefaults(userId: string, defaults: readonly DefaultStatus[]): Promise<void>;
}>;

export function createStatusRepository(db: Database): StatusRepository {
  return {
    async listByUser(userId) {
      const rows = await db.select().from(status).where(eq(status.userId, userId));
      return rows.map(toStatus);
    },

    async findById(userId, statusId) {
      const [row] = await db
        .select()
        .from(status)
        .where(and(eq(status.id, statusId), eq(status.userId, userId)))
        .limit(1);
      return row ? toStatus(row) : null;
    },

    async insertDefaults(userId, defaults) {
      // Dos pedidos simultáneos del mismo usuario nuevo no pueden duplicar los estados.
      await db
        .insert(status)
        .values(defaults.map((value) => toNewStatusRow(userId, value)))
        .onConflictDoNothing();
    },
  };
}
