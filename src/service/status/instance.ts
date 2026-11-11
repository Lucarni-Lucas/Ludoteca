import { getDatabase } from "@/persistence/db";
import { createStatusRepository } from "@/persistence/repository/status/status-repository";
import { createStatusService, type StatusService } from "@/service/status/status-service";

let statusService: StatusService | undefined;

export function getStatusService(): StatusService {
  statusService ??= createStatusService({ statusRepo: createStatusRepository(getDatabase()) });
  return statusService;
}
