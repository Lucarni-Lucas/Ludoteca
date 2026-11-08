export const STATUS_GROUPS = ["in_progress", "not_started", "finished", "dropped"] as const;

export type StatusGroup = (typeof STATUS_GROUPS)[number];
