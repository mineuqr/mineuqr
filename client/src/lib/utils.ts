import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safe src for menu/storage URLs (handles spaces in uploaded file names). */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return encodeURI(trimmed);
  return trimmed;
}
