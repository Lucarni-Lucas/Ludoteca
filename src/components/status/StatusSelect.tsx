import type { StatusGroupView } from "@/model/status/status";

type StatusSelectProps = Readonly<{
  id?: string;
  className?: string;
  groups: readonly StatusGroupView[];
  value: string;
  onChange: (statusId: string) => void;
}>;

export function StatusSelect({ id, className, groups, value, onChange }: StatusSelectProps) {
  return (
    <select id={id} className={className} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Según las copias</option>
      {groups.map(({ group, label, statuses }) => (
        <optgroup key={group} label={label}>
          {statuses.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
