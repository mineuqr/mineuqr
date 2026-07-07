/**
 * OFFER-IMAGE-MANAGEMENT-1 — canonical entity-owned image metadata.
 * Reusable for offer images; menu items retain imageUrl-only for compatibility.
 */
export type EntityImageMetadata = {
  storageKey: string;
  publicUrl: string;
  width: number | null;
  height: number | null;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
};

export const ENTITY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const ENTITY_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type EntityImageMimeType = (typeof ENTITY_IMAGE_ALLOWED_MIME_TYPES)[number];

export function isEntityImageMimeType(value: string): value is EntityImageMimeType {
  return (ENTITY_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function resolveEntityImagePublicUrl(
  image: EntityImageMetadata | null | undefined,
  legacyUrl?: string | null
): string | undefined {
  const url = image?.publicUrl?.trim() || legacyUrl?.trim();
  return url || undefined;
}
