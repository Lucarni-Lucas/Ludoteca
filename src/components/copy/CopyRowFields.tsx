import { useTranslations } from "next-intl";

import controls from "@/components/ui/controls.module.css";
import type { CopyKind } from "@/model/copy/copy";
import type { Store } from "@/model/store/store";

import { CopyKindPicker } from "./CopyKindPicker";
import { OTHER_STORE, StoreSelect } from "./StoreSelect";

/** Una copia como la carga el usuario: la tienda puede ser `OTHER_STORE`, con su nombre aparte. */
export type CopyRowDraft = Readonly<{
  storeId: string;
  otherStoreName: string;
  kind: CopyKind;
  familyOwner: string;
  kindDetail: string;
}>;

export const EMPTY_COPY_ROW: CopyRowDraft = {
  storeId: "",
  otherStoreName: "",
  kind: "purchased",
  familyOwner: "",
  kindDetail: "",
};

/** Lo que se manda: con «Otra» va solo el nombre escrito, y si no, solo el id de la tienda. */
export function toCopyRowValues(row: CopyRowDraft): CopyRowDraft {
  const isOther = row.storeId === OTHER_STORE;

  return {
    storeId: isOther ? "" : row.storeId,
    otherStoreName: isOther ? row.otherStoreName : "",
    kind: row.kind,
    familyOwner: row.familyOwner,
    kindDetail: row.kindDetail,
  };
}

type CopyRowFieldsProps = Readonly<{
  stores: readonly Store[];
  value: CopyRowDraft;
  onChange: (changes: Partial<CopyRowDraft>) => void;
}>;

/** Tienda, tipo y, según el tipo, «De quién es» o el detalle. Lo usan las filas del alta y la ventana de copia. */
export function CopyRowFields({ stores, value, onChange }: CopyRowFieldsProps) {
  const t = useTranslations();

  return (
    <>
      <StoreSelect
        label={t("copy.fields.store")}
        stores={stores}
        value={value.storeId}
        otherName={value.otherStoreName}
        onChange={(storeId) => onChange({ storeId })}
        onOtherNameChange={(otherStoreName) => onChange({ otherStoreName })}
      />
      <CopyKindPicker value={value.kind} onChange={(kind) => onChange({ kind })} />
      {value.kind === "family" ? (
        <label className={controls.field}>
          {t("copy.fields.familyOwner")}
          <input
            className={controls.input}
            type="text"
            placeholder={t("common.optional")}
            value={value.familyOwner}
            onChange={(event) => onChange({ familyOwner: event.target.value })}
          />
        </label>
      ) : null}
      {value.kind === "other" ? (
        <label className={controls.field}>
          {t("copy.fields.kindDetail")}
          <input
            className={controls.input}
            type="text"
            placeholder={t("common.optional")}
            value={value.kindDetail}
            onChange={(event) => onChange({ kindDetail: event.target.value })}
          />
        </label>
      ) : null}
    </>
  );
}
