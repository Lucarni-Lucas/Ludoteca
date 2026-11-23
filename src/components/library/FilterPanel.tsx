import { useTranslations } from "next-intl";

import { useCopyText } from "@/components/copy/copy-text";
import { HELP, type HelpText } from "@/components/ui/help-texts";
import { Toggle } from "@/components/ui/Toggle";
import { COPY_KINDS } from "@/model/copy/copy";
import {
  type CopyKindFilter,
  DURATION_PRESETS,
  type LibraryFilters,
  LOST_KIND,
  PLAYED_PRESETS,
  toggleOption,
} from "@/model/game/filters";
import type { LibraryCounts, StoreOption } from "@/model/game/summary";

import { OptionFilter } from "./OptionFilter";
import { RangeFilter } from "./RangeFilter";

const KIND_FILTERS: readonly CopyKindFilter[] = [...COPY_KINDS, LOST_KIND];
const KIND_HELP: Partial<Record<CopyKindFilter, HelpText>> = { family: HELP.family, other: HELP.other, [LOST_KIND]: HELP.lost };

export type FilterPanelProps = Readonly<{
  filters: LibraryFilters;
  counts: LibraryCounts;
  stores: readonly StoreOption[];
  onChange: (changes: Partial<LibraryFilters>) => void;
}>;

export function FilterPanel({ filters, counts, stores, onChange }: FilterPanelProps) {
  const t = useTranslations("filters");
  const copyText = useCopyText();
  const kindLabel = (kind: CopyKindFilter) => (kind === LOST_KIND ? t("lost") : copyText.kind(kind));

  return (
    <>
      <RangeFilter
        title={t("duration")}
        aside={t("durationSource")}
        unit="h"
        range={filters.duration}
        presets={DURATION_PRESETS}
        minPlaceholder="0"
        maxPlaceholder={t("noTop")}
        hint={t("endlessHint")}
        onChange={(duration) => onChange({ duration })}
      />
      <RangeFilter
        title={t("played")}
        unit="h"
        range={filters.played}
        presets={PLAYED_PRESETS}
        minPlaceholder="0"
        maxPlaceholder={t("noTop")}
        onChange={(played) => onChange({ played })}
      />
      <RangeFilter
        title={t("score")}
        range={filters.score}
        minPlaceholder="0.0"
        maxPlaceholder="10.0"
        step="0.1"
        onChange={(score) => onChange({ score })}
      />
      <OptionFilter
        title={t("store")}
        options={stores.map(({ id, name }) => ({ id, label: name, count: counts.stores[id] ?? 0 }))}
        selected={filters.storeIds}
        onToggle={(id) => onChange({ storeIds: toggleOption(filters.storeIds, id) })}
      />
      <OptionFilter
        title={t("kind")}
        options={KIND_FILTERS.map((kind) => ({
          id: kind,
          label: kindLabel(kind),
          count: counts.kinds[kind],
          help: KIND_HELP[kind],
        }))}
        selected={filters.kinds}
        onToggle={(id) => onChange({ kinds: toggleOption(filters.kinds, id as CopyKindFilter) })}
      />
      <Toggle
        label={t("showNotInterested")}
        help={HELP.notInterested}
        checked={filters.showNotInterested}
        onCheckedChange={(showNotInterested) => onChange({ showNotInterested })}
      />
    </>
  );
}
