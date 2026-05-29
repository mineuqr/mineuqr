export type StoredObject = { key: string; url: string };

export function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/** Public CDN URL for a stored object key. */
export function buildPublicUrl(baseUrl: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${encodedKey}`;
}

export function toBuffer(data: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (typeof data === "string") return Buffer.from(data);
  return Buffer.from(data);
}
