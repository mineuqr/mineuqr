import type { Request } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { effectiveRequestProtocol } from "./_core/secureRequest";
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

/**
 * Dev-only public origin for /uploads URLs persisted to the database.
 * Priority: PUBLIC_APP_URL → Origin → Host + proxy-aware protocol.
 * Fails explicitly when none are available (no silent localhost fallback).
 */
function getPublicBaseUrl(req: Request): string {
  const configured = process.env.PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const origin = req.headers.origin;
  if (typeof origin === "string" && origin.length > 0) return origin;

  const host = req.get("host");
  if (host) return `${effectiveRequestProtocol(req)}://${host}`;

  throw new Error(
    "[local-uploads] Cannot resolve public base URL for dev upload: set PUBLIC_APP_URL or ensure the request includes Origin or Host headers."
  );
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
