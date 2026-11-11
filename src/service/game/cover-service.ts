import { assertValidCover, type CoverFile, coverPath } from "@/model/game/cover-upload";

type CoverServiceDependencies = Readonly<{
  storage: Readonly<{
    uploadCover(path: string, bytes: ArrayBuffer, contentType: string): Promise<string>;
  }>;
  newFileId: () => string;
}>;

export type CoverService = Readonly<{
  uploadCover(userId: string, file: CoverFile): Promise<string>;
}>;

export function createCoverService({ storage, newFileId }: CoverServiceDependencies): CoverService {
  return {
    uploadCover(userId, file) {
      assertValidCover(file);
      return storage.uploadCover(coverPath(userId, newFileId()), file.bytes, file.contentType);
    },
  };
}
