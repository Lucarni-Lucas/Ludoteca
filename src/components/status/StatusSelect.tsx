import { useId } from "react";

import { chosenOrBacklog, type StatusGroupView } from "@/model/status/status";

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

/**
 * Todos los estados (`04` design.md §22). Debajo va la línea del estado elegido: un `<select>` no puede
 * mostrar una por opción.
 */
export function StatusSelect({ id, className, groups, value, onChange }: StatusSelectProps) {
  const statusText = useStatusText();
  const meaningId = useId();
  const chosen = chosenOrBacklog(groups.flatMap(({ statuses }) => statuses), value);
  const meaning = chosen ? statusText.meaning(chosen) : null;

  return (
    <>
      <select
        id={id}
        className={className}
        value={chosen?.id ?? ""}
        aria-describedby={meaning ? meaningId : undefined}
        onChange={(event) => onChange(event.target.value)}
      >
        {groups.map(({ group, statuses }) => (
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
