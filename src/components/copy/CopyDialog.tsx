"use client";

import { useState } from "react";

import controls from "@/components/ui/controls.module.css";
import { Modal } from "@/components/ui/Modal";
import type { CopyKind } from "@/model/copy/copy";
import type { Store } from "@/model/store/store";

import { CopyKindPicker } from "./CopyKindPicker";
import { OTHER_STORE, StoreSelect } from "./StoreSelect";

export type NewCopyValues = Readonly<{
  storeId: string;
  otherStoreName: string;
  kind: CopyKind;
  acquiredOn: string;
  familyOwner: string;
}>;

type CopyDialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: readonly Store[];
  pending: boolean;
  errorMessage: string | null;
  onSave: (values: NewCopyValues) => void;
}>;

export function CopyDialog({ open, onOpenChange, stores, pending, errorMessage, onSave }: CopyDialogProps) {
  const [storeId, setStoreId] = useState("");
  const [otherStoreName, setOtherStoreName] = useState("");
  const [kind, setKind] = useState<CopyKind>("purchased");
  const [acquiredOn, setAcquiredOn] = useState("");
  const [familyOwner, setFamilyOwner] = useState("");

  function save(): void {
    onSave({
      storeId: storeId === OTHER_STORE ? "" : storeId,
      otherStoreName: storeId === OTHER_STORE ? otherStoreName : "",
      kind,
      acquiredOn,
      familyOwner,
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar copia"
      footer={
        <>
          <button type="button" className={controls.secondary} onClick={() => onOpenChange(false)}>
            Cancelar
          </button>
          <button type="button" className={controls.primary} disabled={pending} onClick={save}>
            Guardar copia
          </button>
        </>
      }
    >
      <StoreSelect
        label="Tienda"
        stores={stores}
        value={storeId}
        otherName={otherStoreName}
        onChange={setStoreId}
        onOtherNameChange={setOtherStoreName}
      />
      <CopyKindPicker value={kind} onChange={(next) => setKind(next ?? "purchased")} />
      {kind === "family" ? (
        <label className={controls.field}>
          De quién es
          <input
            className={controls.input}
            type="text"
            value={familyOwner}
            onChange={(event) => setFamilyOwner(event.target.value)}
          />
        </label>
      ) : null}
      <label className={controls.field}>
        Cuándo lo conseguiste (opcional)
        <input
          className={controls.input}
          type="date"
          value={acquiredOn}
          onChange={(event) => setAcquiredOn(event.target.value)}
        />
      </label>
      {errorMessage ? <p className={controls.error}>{errorMessage}</p> : null}
    </Modal>
  );
}
