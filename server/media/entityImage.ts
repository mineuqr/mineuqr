import { TRPCError } from "@trpc/server";
import type { EntityImageMetadata } from "../../shared/entityImage";
import {
  ENTITY_IMAGE_ALLOWED_MIME_TYPES,
  ENTITY_IMAGE_MAX_BYTES,
  isEntityImageMimeType,
} from "../../shared/entityImage";

export function validateEntityImageUpload(input: {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}): { mimeType: EntityImageMetadata["mimeType"]; fileSize: number } {
  const fileSize = input.buffer.byteLength;
  if (fileSize === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "ملف الصورة فارغ" });
  }
  if (fileSize > ENTITY_IMAGE_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "حجم الصورة يتجاوز الحد المسموح (5 ميجابايت)",
    });
  }

  const contentType = input.contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  if (!isEntityImageMimeType(contentType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "نوع الصورة غير مدعوم. استخدم JPEG أو PNG أو WebP أو GIF",
    });
  }

  if (!input.fileName.trim()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "اسم الملف غير صالح" });
  }

  return { mimeType: contentType, fileSize };
}

/** Probe width/height from JPEG/PNG headers without external dependencies. */
export function probeImageDimensions(
  buffer: Buffer
): Pick<EntityImageMetadata, "width" | "height"> {
  if (buffer.length < 24) return { width: null, height: null };

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      if (marker === undefined) break;
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      offset += 2 + length;
    }
  }

  if (
    buffer.length >= 30 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buffer.length >= 30) {
      const width =
        1 +
        buffer.readUIntLE(24, 1) +
        (buffer.readUIntLE(25, 1) << 8) +
        (buffer.readUIntLE(26, 1) << 16);
      const height =
        1 +
        buffer.readUIntLE(27, 1) +
        (buffer.readUIntLE(28, 1) << 8) +
        (buffer.readUIntLE(29, 1) << 16);
      return { width, height };
    }
  }

  return { width: null, height: null };
}

export function buildEntityImageMetadata(input: {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
}): EntityImageMetadata {
  const { width, height } = probeImageDimensions(input.buffer);
  return {
    storageKey: input.storageKey,
    publicUrl: input.publicUrl,
    width,
    height,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    uploadedAt: new Date().toISOString(),
  };
}

export function parseStoredEntityImage(value: unknown): EntityImageMetadata | null {
  if (value == null || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.storageKey !== "string" || typeof row.publicUrl !== "string") return null;
  if (typeof row.mimeType !== "string" || typeof row.fileSize !== "number") return null;
  if (typeof row.uploadedAt !== "string") return null;
  return {
    storageKey: row.storageKey,
    publicUrl: row.publicUrl,
    width: typeof row.width === "number" ? row.width : null,
    height: typeof row.height === "number" ? row.height : null,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    uploadedAt: row.uploadedAt,
  };
}

export { ENTITY_IMAGE_ALLOWED_MIME_TYPES, ENTITY_IMAGE_MAX_BYTES };
