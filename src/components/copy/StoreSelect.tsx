import controls from "@/components/ui/controls.module.css";
import type { Store } from "@/model/store/store";

export const OTHER_STORE = "other";

type StoreSelectProps = Readonly<{
  label: string;
  stores: readonly Store[];
  value: string;
  otherName: string;
  onChange: (storeId: string) => void;
  onOtherNameChange: (name: string) => void;
}>;

export function StoreSelect({ label, stores, value, otherName, onChange, onOtherNameChange }: StoreSelectProps) {
  return (
    <>
      <label className={controls.field}>
        {label}
        <select className={controls.select} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Elegí una tienda</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
          <option value={OTHER_STORE}>Otra</option>
        </select>
      </label>
      {value === OTHER_STORE ? (
        <label className={controls.field}>
          Nombre de la tienda
          <input
            className={controls.input}
            type="text"
            value={otherName}
            onChange={(event) => onOtherNameChange(event.target.value)}
          />
        </label>
      ) : null}
    </>
  );
}
