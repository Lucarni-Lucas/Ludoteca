import { useTranslations } from "next-intl";

import { EndlessConfirm } from "@/components/status/EndlessConfirm";
import { Checkbox } from "@/components/ui/Checkbox";

type EntryStatusExtrasProps = Readonly<{
  completed: boolean;
  hundredPercent: boolean;
  onHundredPercentChange: (checked: boolean) => void;
  /** El aviso de «Sin fin» abierto: `true` si el estado elegido le pone la marca. */
  confirmingEndless: boolean;
  endlessChange: boolean | null;
  pending: boolean;
  errorMessage: string | null;
  onCancelEndless: () => void;
  onAcceptEndless: () => void;
}>;

/** Lo que el alta suma al estado: la casilla «Lo completé al 100%» y el aviso de «Sin fin» (`04` design.md §22). */
export function EntryStatusExtras({
  completed,
  hundredPercent,
  onHundredPercentChange,
  confirmingEndless,
  endlessChange,
  pending,
  errorMessage,
  onCancelEndless,
  onAcceptEndless,
}: EntryStatusExtrasProps) {
  const t = useTranslations("status");

  return (
    <>
      {completed ? <Checkbox label={t("hundredPercent")} checked={hundredPercent} onCheckedChange={onHundredPercentChange} /> : null}
      {confirmingEndless && endlessChange !== null ? (
        <EndlessConfirm
          endless={endlessChange}
          pending={pending}
          errorMessage={errorMessage}
          onCancel={onCancelEndless}
          onAccept={onAcceptEndless}
        />
      ) : null}
    </>
  );
}
