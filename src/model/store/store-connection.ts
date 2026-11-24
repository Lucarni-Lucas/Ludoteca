/** Una cuenta de una tienda conectada: en Steam, `accountId` es el SteamID64. */
export type StoreConnection = Readonly<{
  storeId: string;
  accountId: string;
  /** Vacío hasta que `05` sincronice la tienda por primera vez. */
  lastSyncedAt: string | null;
}>;

export type NewStoreConnection = Pick<StoreConnection, "storeId" | "accountId">;
