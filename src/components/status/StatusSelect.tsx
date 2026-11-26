import { useId } from "react";

import { BACKLOG_KEY, offeredStatuses, type Status, type StatusGroupView } from "@/model/status/status";

import styles from "./StatusSelect.module.css";
import { useStatusText } from "./status-text";

type StatusSelectProps = Readonly<{
  id?: string;
  className?: string;
  groups: readonly StatusGroupView[];
  /** Vacío es «el de entrada»: el Backlog del usuario (spec «Estado inicial»). */
  value: string;
  onChange: (statusId: string) => void;
}>;

function backlogOf(groups: readonly StatusGroupView[]): Status | undefined {
  return groups.flatMap(({ statuses }) => statuses).find((status) => status.systemKey === BACKLOG_KEY);
}

/**
 * Un juego nuevo todavía no es sin fin (la marca se pone después, en la ficha), así que se ofrecen los estados
 * de un juego con final. Debajo va la línea del estado elegido: un `<select>` no puede mostrar una por opción.
 */
export function StatusSelect({ id, className, groups, value, onChange }: StatusSelectProps) {
  const statusText = useStatusText();
  const meaningId = useId();
  const selected = value || backlogOf(groups)?.id || "";
  const offered = groups.map((view) => ({
    ...view,
    statuses: offeredStatuses(view.statuses, { endless: false, currentId: selected }),
  }));
  const chosen = offered.flatMap(({ statuses }) => statuses).find((status) => status.id === selected);
  const meaning = chosen ? statusText.meaning(chosen) : null;

  return (
    <>
      <select
        id={id}
        className={className}
        value={selected}
        aria-describedby={meaning ? meaningId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {offered.map(({ group, statuses }) => (
          <optgroup key={group} label={statusText.group(group)}>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {statusText.name(status)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {meaning ? (
        // Fuera del nombre del campo (queda «Estado») y como su descripción.
        <span id={meaningId} aria-hidden="true" className={styles.meaning}>
          {meaning}
        </span>
      ) : null}
    </>
  );
}
