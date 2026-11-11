import type { DefaultStatus, Status } from "@/model/status/status";
import type { status } from "@/persistence/sql/status/status";

type StatusRow = typeof status.$inferSelect;
type NewStatusRow = typeof status.$inferInsert;

export function toStatus(row: StatusRow): Status {
  return {
    id: row.id,
    group: row.statusGroup,
    name: row.name,
    color: row.color,
    position: row.position,
    systemKey: row.systemKey,
  };
}

export function toNewStatusRow(userId: string, value: DefaultStatus): NewStatusRow {
  return {
    userId,
    statusGroup: value.group,
    name: value.name,
    color: value.color,
    position: value.position,
    systemKey: value.systemKey,
  };
}
