// Object storage facade: Cloudflare R2 (default path) or Forge (legacy rollback).

import { ENV } from "./_core/env";
import { forgeStorageGet, forgeStoragePut } from "./storage/forge-provider";
import { r2StorageGet, r2StoragePut } from "./storage/r2-provider";

export type { StoredObject } from "./storage/shared";

type StorageProviderName = "r2" | "forge";

function resolveProvider(): StorageProviderName {
  const raw = ENV.storageProvider.trim().toLowerCase();
  if (raw === "r2" || raw === "forge") return raw;
  throw new Error(
    `Invalid STORAGE_PROVIDER "${ENV.storageProvider}". Use "r2" or "forge".`
  );
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (resolveProvider() === "r2") {
    return r2StoragePut(relKey, data, contentType);
  }
  return forgeStoragePut(relKey, data, contentType);
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  if (resolveProvider() === "r2") {
    return r2StorageGet(relKey);
  }
  return forgeStorageGet(relKey);
}
