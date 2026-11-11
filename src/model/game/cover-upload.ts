import { CoverTooLargeError, CoverTypeNotAllowedError } from "@/model/game/cover-errors";

export const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

export type CoverFile = Readonly<{
  bytes: ArrayBuffer;
  contentType: string;
  size: number;
}>;

export function assertValidCover(file: Pick<CoverFile, "contentType" | "size">): void {
  if (!(ALLOWED_COVER_TYPES as readonly string[]).includes(file.contentType)) {
    throw new CoverTypeNotAllowedError();
  }

  if (file.size > MAX_COVER_BYTES) {
    throw new CoverTooLargeError();
  }
}

export function coverPath(userId: string, fileId: string): string {
  return `${userId}/${fileId}`;
}
