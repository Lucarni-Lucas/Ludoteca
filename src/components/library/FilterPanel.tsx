import { HELP, type HelpText } from "@/components/ui/help-texts";
import { Toggle } from "@/components/ui/Toggle";
import { COPY_KIND_LABELS, COPY_KINDS } from "@/model/copy/copy";
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

const KIND_LABELS: Readonly<Record<CopyKindFilter, string>> = { ...COPY_KIND_LABELS, [LOST_KIND]: "Ya no lo tengo" };
const KIND_FILTERS: readonly CopyKindFilter[] = [...COPY_KINDS, LOST_KIND];
const KIND_HELP: Partial<Record<CopyKindFilter, HelpText>> = { family: HELP.family, other: HELP.other, [LOST_KIND]: HELP.lost };
const NO_TOP = "sin tope";

export type FilterPanelProps = Readonly<{
  filters: LibraryFilters;
  counts: LibraryCounts;
  stores: readonly StoreOption[];
  onChange: (changes: Partial<LibraryFilters>) => void;
}>;

export function FilterPanel({ filters, counts, stores, onChange }: FilterPanelProps) {
  return (
    <>
      <RangeFilter
        title="Duración estimada"
        aside="IGDB o tuya"
        unit="h"
        range={filters.duration}
        presets={DURATION_PRESETS}
        minPlaceholder="0"
        maxPlaceholder={NO_TOP}
        hint="Los juegos «Sin fin» no tienen duración y quedan afuera de este filtro."
        onChange={(duration) => onChange({ duration })}
      />
      <RangeFilter
        title="Horas que jugaste"
        unit="h"
        range={filters.played}
        presets={PLAYED_PRESETS}
        minPlaceholder="0"
        maxPlaceholder={NO_TOP}
        onChange={(played) => onChange({ played })}
      />
      <RangeFilter
        title="Tu puntaje"
        range={filters.score}
        minPlaceholder="0.0"
        maxPlaceholder="10.0"
        step="0.1"
        onChange={(score) => onChange({ score })}
      />
      <OptionFilter
        title="Tienda"
        options={stores.map(({ id, name }) => ({ id, label: name, count: counts.stores[id] ?? 0 }))}
        selected={filters.storeIds}
        onToggle={(id) => onChange({ storeIds: toggleOption(filters.storeIds, id) })}
      />
      <OptionFilter
        title="Cómo lo tenés"
        options={KIND_FILTERS.map((kind) => ({
          id: kind,
          label: KIND_LABELS[kind],
          count: counts.kinds[kind],
          help: KIND_HELP[kind],
        }))}
        selected={filters.kinds}
        onToggle={(id) => onChange({ kinds: toggleOption(filters.kinds, id as CopyKindFilter) })}
      />
      <Toggle
        label="Mostrar sin interés"
        help={HELP.notInterested}
        checked={filters.showNotInterested}
        onCheckedChange={(showNotInterested) => onChange({ showNotInterested })}
      />
    </>
  );
}
