import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type EndlessConfirmProps = Readonly<{
  /** `true` si el estado elegido le pone la marca «Sin fin»; `false` si se la saca. */
  endless: boolean;
  /** Cuántos juegos cambian: en lote, el aviso dice la cantidad (`04` design.md §22). */
  count?: number;
  pending: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onAccept: () => void;
}>;

/** El aviso de «Jugado» y «Completado»: aceptarlo cambia el estado y la marca juntos; cancelar no cambia nada. */
export function EndlessConfirm({ endless, count = 1, pending, errorMessage, onCancel, onAccept }: EndlessConfirmProps) {
  const t = useTranslations("status.endlessConfirm");

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onCancel())}
      title={t("title")}
      description={endless ? t("add", { count }) : t("remove", { count })}
      confirmLabel={t("accept")}
      pending={pending}
      errorMessage={errorMessage}
      onConfirm={onAccept}
      tone="primary"
    />
  );
}
