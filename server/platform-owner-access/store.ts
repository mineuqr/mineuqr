/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Persistence for owner access mode. In-memory override for tests.
 */

import { eq } from "drizzle-orm";
import { platformOwnerAccessMode } from "../../drizzle/schema";
import { getDb } from "../db";
import type { OwnerAccessModeRecord, PlatformOwnerAccessMode } from "./types";

const memory = new Map<string, OwnerAccessModeRecord>();
let useMemoryOnly = false;

export function setPlatformOwnerAccessMemoryOnlyForTests(enabled: boolean): void {
  useMemoryOnly = enabled;
  if (enabled) memory.clear();
}

export function clearPlatformOwnerAccessStoreForTests(): void {
  memory.clear();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function readOwnerAccessRecord(
  ownerOpenId: string
): Promise<OwnerAccessModeRecord | null> {
  if (useMemoryOnly) {
    return memory.get(ownerOpenId) ?? null;
  }
  const db = await getDb();
  if (!db) return memory.get(ownerOpenId) ?? null;
  const rows = await db
    .select()
    .from(platformOwnerAccessMode)
    .where(eq(platformOwnerAccessMode.ownerOpenId, ownerOpenId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ownerOpenId: row.ownerOpenId,
    mode: row.mode,
    simulatedPlanCode: row.simulatedPlanCode ?? null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export async function writeOwnerAccessRecord(input: {
  ownerOpenId: string;
  mode: PlatformOwnerAccessMode;
  simulatedPlanCode: string | null;
}): Promise<OwnerAccessModeRecord> {
  const existing = await readOwnerAccessRecord(input.ownerOpenId);
  const now = nowIso();
  const record: OwnerAccessModeRecord = {
    ownerOpenId: input.ownerOpenId,
    mode: input.mode,
    simulatedPlanCode: input.simulatedPlanCode,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (useMemoryOnly) {
    memory.set(input.ownerOpenId, record);
    return record;
  }

  const db = await getDb();
  if (!db) {
    memory.set(input.ownerOpenId, record);
    return record;
  }

  await db
    .insert(platformOwnerAccessMode)
    .values({
      ownerOpenId: record.ownerOpenId,
      mode: record.mode,
      simulatedPlanCode: record.simulatedPlanCode,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        mode: record.mode,
        simulatedPlanCode: record.simulatedPlanCode,
        updatedAt: record.updatedAt,
      },
    });
  return record;
}
