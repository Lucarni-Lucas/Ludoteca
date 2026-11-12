import type { Copy } from "@/model/copy/copy";
import type { NewCopy } from "@/model/copy/new-copy";
import type { copy } from "@/persistence/sql/copy/copy";

type CopyRow = typeof copy.$inferSelect;
type NewCopyRow = typeof copy.$inferInsert;

export function toCopy(row: CopyRow, storeName: string): Copy {
  return {
    id: row.id,
    storeId: row.storeId,
    storeName,
    kind: row.kind,
    acquiredOn: row.acquiredOn,
    playtimeMinutes: row.playtimeMinutes,
    familyOwner: row.familyOwner,
    kindDetail: row.kindDetail ?? undefined,
    lostAt: row.lostAt,
    lostReason: row.lostReason,
  };
}

export function toNewCopyRow(userId: string, libraryGameId: string, value: NewCopy): NewCopyRow {
  return {
    userId,
    libraryGameId,
    storeId: value.storeId,
    kind: value.kind,
    acquiredOn: value.acquiredOn,
    familyOwner: value.familyOwner,
    kindDetail: value.kindDetail ?? null,
  };
}
