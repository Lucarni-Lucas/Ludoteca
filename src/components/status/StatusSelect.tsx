import { useTranslations } from "next-intl";

import type { StatusGroupView } from "@/model/status/status";

import { useStatusText } from "./status-text";

type StatusSelectProps = Readonly<{
  id?: string;
  className?: string;
  groups: readonly StatusGroupView[];
  value: string;
  onChange: (statusId: string) => void;
}>;

export function StatusSelect({ id, className, groups, value, onChange }: StatusSelectProps) {
  const t = useTranslations("status");
  const statusText = useStatusText();

  return (
    <select id={id} className={className} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{t("fromCopies")}</option>
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
  );
}
