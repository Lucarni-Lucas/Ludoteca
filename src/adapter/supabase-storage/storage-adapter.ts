import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { StorageEnv } from "@/config/env";
import { logger } from "@/shared/logger";

import { CoverUploadFailedError } from "./errors";

const COVERS_BUCKET = "covers";

export type StorageAdapter = Readonly<{
  uploadCover(path: string, bytes: ArrayBuffer, contentType: string): Promise<string>;
}>;

export function createStorageAdapter(getEnv: () => StorageEnv): StorageAdapter {
  let client: SupabaseClient | undefined;

  // La secret key se lee al primer uso: sin ella, la biblioteca sigue andando.
  function storage() {
    if (!client) {
      const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY } = getEnv();
      client = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }

    return client.storage.from(COVERS_BUCKET);
  }

  return {
    async uploadCover(path, bytes, contentType) {
      const { error } = await storage().upload(path, bytes, { contentType });

      if (error) {
        logger.warn("No se pudo subir una portada", { error });
        throw new CoverUploadFailedError();
      }

      return storage().getPublicUrl(path).data.publicUrl;
    },
  };
}
