import type { EntityImageMetadata } from "@shared/entityImage";
import {
  ENTITY_IMAGE_ALLOWED_MIME_TYPES,
  ENTITY_IMAGE_MAX_BYTES,
  resolveEntityImagePublicUrl,
} from "@shared/entityImage";
import { resolveImageUrl } from "@/lib/utils";

export type OfferImageSource = {
  imageUrl?: string | null;
  image?: EntityImageMetadata | null;
};

export function resolveOfferImageUrl(offer: OfferImageSource): string | undefined {
  return resolveImageUrl(resolveEntityImagePublicUrl(offer.image, offer.imageUrl));
}

export function validateOfferImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "invalidImageType";
  }
  if (!(ENTITY_IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "invalidImageType";
  }
  if (file.size > ENTITY_IMAGE_MAX_BYTES) {
    return "imageTooLarge";
  }
  return null;
}

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

export async function probeClientImageDimensions(
  file: File
): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) return { width: null, height: null };
  const url = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    return dims;
  } catch {
    return { width: null, height: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}
