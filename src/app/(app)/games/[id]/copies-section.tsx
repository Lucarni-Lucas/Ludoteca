"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { CopyDialog, type NewCopyValues } from "@/components/copy/CopyDialog";
import { CopyList } from "@/components/copy/CopyList";
import { LostCopyDialog } from "@/components/copy/LostCopyDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import controls from "@/components/ui/controls.module.css";
import { useServerAction } from "@/hooks/use-server-action";
import type { Copy, LostReason } from "@/model/copy/copy";
import type { Store } from "@/model/store/store";

import { addCopyAction, markCopyLostAction, recoverCopyAction, removeCopyAction } from "./actions";

type CopiesSectionProps = Readonly<{
  gameId: string;
  copies: readonly Copy[];
  stores: readonly Store[];
  openAddDialog: boolean;
}>;

export function CopiesSection({ gameId, copies, stores, openAddDialog }: CopiesSectionProps) {
  const t = useTranslations("game");
  const [addOpen, setAddOpen] = useState(openAddDialog);
  const [lostCopy, setLostCopy] = useState<Copy | null>(null);
  const [removedCopy, setRemovedCopy] = useState<Copy | null>(null);
  const add = useServerAction(addCopyAction);
  const markLost = useServerAction(markCopyLostAction);
  const recover = useServerAction(recoverCopyAction);
  const remove = useServerAction(removeCopyAction);

  async function saveCopy(values: NewCopyValues): Promise<void> {
    const result = await add.run(gameId, values);

    if (result.ok) {
      setAddOpen(false);
    }
  }

  async function saveLost(copy: Copy, reason: LostReason, lostAt: string): Promise<void> {
    const result = await markLost.run(gameId, copy.id, reason, lostAt);

    if (result.ok) {
      setLostCopy(null);
    }
  }

  async function confirmRemoval(copy: Copy): Promise<void> {
    const result = await remove.run(gameId, copy.id);

    if (result.ok) {
      setRemovedCopy(null);
    }
  }

  return (
    <>
      <CopyList
        copies={copies}
        onAdd={() => setAddOpen(true)}
        onMarkLost={setLostCopy}
        onRecover={(copy) => void recover.run(gameId, copy.id)}
        onRemove={setRemovedCopy}
      />
      {recover.errorMessage ? <p className={controls.error}>{recover.errorMessage}</p> : null}

      {addOpen ? (
        <CopyDialog
          open
          onOpenChange={setAddOpen}
          stores={stores}
          pending={add.pending}
          errorMessage={add.errorMessage}
          onSave={(values) => void saveCopy(values)}
        />
      ) : null}

      {lostCopy ? (
        <LostCopyDialog
          open
          onOpenChange={(open) => setLostCopy(open ? lostCopy : null)}
          storeName={lostCopy.storeName}
          pending={markLost.pending}
          errorMessage={markLost.errorMessage}
          onSave={(reason, lostAt) => void saveLost(lostCopy, reason, lostAt)}
        />
      ) : null}

      {removedCopy ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => setRemovedCopy(open ? removedCopy : null)}
          title={t("removeCopy.title")}
          description={t("removeCopy.description", { store: removedCopy.storeName })}
          confirmLabel={t("removeCopy.confirm")}
          pending={remove.pending}
          errorMessage={remove.errorMessage}
          onConfirm={() => void confirmRemoval(removedCopy)}
        />
      ) : null}
    </>
  );
}
