"use client";

import { ManualGameForm } from "@/components/game/ManualGameForm";
import { useRedirectingAction } from "@/hooks/use-redirecting-action";
import { useServerAction } from "@/hooks/use-server-action";
import type { StatusGroupView } from "@/model/status/status";
import type { Store } from "@/model/store/store";

import { addManualGameAction, uploadCoverAction } from "./actions";

type ManualGameSectionProps = Readonly<{
  stores: readonly Store[];
  statusGroups: readonly StatusGroupView[];
}>;

export function ManualGameSection({ stores, statusGroups }: ManualGameSectionProps) {
  const save = useRedirectingAction(addManualGameAction);
  const upload = useServerAction(uploadCoverAction);

  async function uploadCover(file: File): Promise<string | undefined> {
    const formData = new FormData();
    formData.set("cover", file);
    const result = await upload.run(formData);

    return result.ok ? result.data : undefined;
  }

  return (
    <ManualGameForm
      stores={stores}
      statusGroups={statusGroups}
      pending={save.pending}
      errorMessage={save.errorMessage}
      uploading={upload.pending}
      uploadError={upload.errorMessage}
      onUploadCover={uploadCover}
      onSubmit={save.run}
    />
  );
}
