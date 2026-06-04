import type { Request } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { storagePut } from "./storage";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

/** On-disk root for dev uploads (served at /uploads). */
export const UPLOADS_DIR = path.join(projectRoot, "uploads");

/** @deprecated use UPLOADS_DIR */
export const MENU_UPLOADS_DIR = UPLOADS_DIR;

/** Local disk in development; R2 via storagePut in production. */
export function useLocalUploads(): boolean {
  return process.env.NODE_ENV === "development";
}

/** @deprecated use useLocalUploads */
export const useLocalMenuItemUploads = useLocalUploads;

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function getPublicBaseUrl(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto =
    (typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0]?.trim()
      : undefined) ||
    req.protocol ||
    "http";
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (typeof forwardedHost === "string"
      ? forwardedHost.split(",")[0]?.trim()
      : undefined) ||
    req.get("host") ||
    "localhost:3000";
  return `${proto}://${host}`;
}

/** Write file under uploads/; returns absolute public URL. */
export async function putFileLocal(
  relKey: string,
  data: Buffer,
  req: Request
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  const url = `${getPublicBaseUrl(req)}/uploads/${key}`;
  return { key, url };
}

/** @deprecated use putFileLocal */
export const putMenuItemImageLocal = putFileLocal;

/** Local disk in dev; storagePut (R2) in production. */
export async function putUploadedFile(
  relKey: string,
  data: Buffer,
  contentType: string,
  req: Request
): Promise<{ key: string; url: string }> {
  if (useLocalUploads()) {
    return putFileLocal(relKey, data, req);
  }
  return storagePut(relKey, data, contentType);
}

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

/** @deprecated use ensureUploadsDir */
export const ensureMenuUploadsDir = ensureUploadsDir;
