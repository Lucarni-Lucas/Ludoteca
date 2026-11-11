import { StoreNotFoundError } from "@/model/store/errors";
import { assertValidStoreName, findStoreByName, type Store, storeSlug } from "@/model/store/store";

/** Una tienda elegida de la lista, o una escrita a mano en «Otra». */
export type StoreChoice = Readonly<{ storeId: string }> | Readonly<{ otherName: string }>;

export type StoreLookup = Readonly<{
  listAvailable(userId: string): Promise<readonly Store[]>;
  findAvailable(userId: string, storeId: string): Promise<Store | null>;
  insertOwn(userId: string, name: string, slug: string): Promise<Store>;
}>;

export type StoreResolver = Readonly<{
  resolve(userId: string, choice: StoreChoice): Promise<Store>;
}>;

export function createStoreResolver(storeRepo: StoreLookup): StoreResolver {
  async function findChosen(userId: string, storeId: string): Promise<Store> {
    const store = await storeRepo.findAvailable(userId, storeId);

    if (!store) {
      throw new StoreNotFoundError();
    }

    return store;
  }

  async function findOrCreate(userId: string, name: string): Promise<Store> {
    assertValidStoreName(name);

    const existing = findStoreByName(await storeRepo.listAvailable(userId), name);
    return existing ?? storeRepo.insertOwn(userId, name, storeSlug(name));
  }

  return {
    resolve(userId, choice) {
      return "storeId" in choice ? findChosen(userId, choice.storeId) : findOrCreate(userId, choice.otherName);
    },
  };
}
