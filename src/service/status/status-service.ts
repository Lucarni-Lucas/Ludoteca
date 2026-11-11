import {
  DEFAULT_STATUSES,
  type DefaultStatus,
  groupStatuses,
  needsDefaultStatuses,
  type Status,
  type StatusGroupView,
} from "@/model/status/status";

type StatusServiceDependencies = Readonly<{
  statusRepo: Readonly<{
    listByUser(userId: string): Promise<readonly Status[]>;
    insertDefaults(userId: string, defaults: readonly DefaultStatus[]): Promise<void>;
  }>;
}>;

export type StatusService = Readonly<{
  listStatuses(userId: string): Promise<readonly Status[]>;
  listGrouped(userId: string): Promise<readonly StatusGroupView[]>;
}>;

export function createStatusService({ statusRepo }: StatusServiceDependencies): StatusService {
  /** Al primer uso, y no en el ingreso: quien ya tiene la sesión abierta desde 01-base no pasaría por ahí. */
  async function listStatuses(userId: string): Promise<readonly Status[]> {
    const existing = await statusRepo.listByUser(userId);

    if (!needsDefaultStatuses(existing)) {
      return existing;
    }

    await statusRepo.insertDefaults(userId, DEFAULT_STATUSES);
    return statusRepo.listByUser(userId);
  }

  return {
    listStatuses,

    async listGrouped(userId) {
      return groupStatuses(await listStatuses(userId));
    },
  };
}
