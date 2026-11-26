import { StatusNotFoundError } from "@/model/status/errors";
import { BACKLOG_KEY, findStatusByKey, type Status } from "@/model/status/status";

type InitialStatusChoice = Readonly<{
  chosenStatusId: string | null;
}>;

function findChosen(statuses: readonly Status[], chosenStatusId: string): Status | undefined {
  return statuses.find((status) => status.id === chosenStatusId);
}

/**
 * Un juego nuevo entra en Backlog, tenga copias o no, salvo que se elija otro estado. `statuses` son solo los
 * del usuario, así que un id ajeno no se encuentra.
 */
export function resolveInitialStatus(statuses: readonly Status[], { chosenStatusId }: InitialStatusChoice): Status {
  const status = chosenStatusId === null ? findStatusByKey(statuses, BACKLOG_KEY) : findChosen(statuses, chosenStatusId);

  if (!status) {
    throw new StatusNotFoundError();
  }

  return status;
}
