// Object storage facade: Cloudflare R2.

import { r2StorageGet, r2StoragePut } from "./storage/r2-provider";

export type { StoredObject } from "./storage/shared";

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  return r2StoragePut(relKey, data, contentType);
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  return r2StorageGet(relKey);
}
