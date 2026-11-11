import { StatusNotFoundError } from "@/model/status/errors";
import { BACKLOG_KEY, findStatusByKey, type Status, WISHLIST_KEY } from "@/model/status/status";

type InitialStatusChoice = Readonly<{
  chosenStatusId: string | null;
  hasCopy: boolean;
}>;

function findChosen(statuses: readonly Status[], chosenStatusId: string): Status | undefined {
  return statuses.find((status) => status.id === chosenStatusId);
}

function findByCopies(statuses: readonly Status[], hasCopy: boolean): Status | undefined {
  return findStatusByKey(statuses, hasCopy ? BACKLOG_KEY : WISHLIST_KEY);
}

/** `statuses` son solo los del usuario, así que un id ajeno no se encuentra. */
export function resolveInitialStatus(statuses: readonly Status[], choice: InitialStatusChoice): Status {
  const { chosenStatusId, hasCopy } = choice;
  const status = chosenStatusId === null ? findByCopies(statuses, hasCopy) : findChosen(statuses, chosenStatusId);

  if (!status) {
    throw new StatusNotFoundError();
  }

  return status;
}
