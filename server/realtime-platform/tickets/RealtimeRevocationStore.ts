/**
 * REALTIME-MULTI-INSTANCE-FANOUT-1 — Phase 4
 * Shared ticket jti revocation over TiDB (local cache + durable rows).
 */

import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../../db";
import { realtimeTicketRevocations } from "../../../drizzle/schema";

const localRevoked = new Set<string>();
const localExpires = new Map<string, number>();

export type RealtimeRevocationStore = {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
  clear(): void;
};

function rememberLocal(jti: string, expiresAtMs: number): void {
  localRevoked.add(jti);
  localExpires.set(jti, expiresAtMs);
}

export function isRealtimeTicketRevokedLocal(jti: string): boolean {
  const exp = localExpires.get(jti);
  if (!localRevoked.has(jti)) return false;
  if (exp != null && exp < Date.now()) {
    localRevoked.delete(jti);
    localExpires.delete(jti);
    return false;
  }
  return true;
}

export function createDrizzleRealtimeRevocationStore(): RealtimeRevocationStore {
  return {
    async revoke(jti, expiresAtMs) {
      rememberLocal(jti, expiresAtMs);
      try {
        const db = await getDb();
        if (!db) return;
        await db
          .insert(realtimeTicketRevocations)
          .values({
            jti,
            expiresAt: new Date(expiresAtMs),
          })
          .onDuplicateKeyUpdate({
            set: { expiresAt: new Date(expiresAtMs) },
          });
        await db
          .delete(realtimeTicketRevocations)
          .where(lt(realtimeTicketRevocations.expiresAt, new Date()));
      } catch {
        /* fail-open write — local cache still set on this instance */
      }
    },
    async isRevoked(jti) {
      if (isRealtimeTicketRevokedLocal(jti)) return true;
      try {
        const db = await getDb();
        if (!db) return false;
        const rows = await db
          .select()
          .from(realtimeTicketRevocations)
          .where(
            and(
              eq(realtimeTicketRevocations.jti, jti),
              gt(realtimeTicketRevocations.expiresAt, new Date())
            )
          )
          .limit(1);
        const row = rows[0];
        if (!row) return false;
        rememberLocal(row.jti, row.expiresAt.getTime());
        return true;
      } catch {
        return isRealtimeTicketRevokedLocal(jti);
      }
    },
    clear() {
      localRevoked.clear();
      localExpires.clear();
    },
  };
}

let store: RealtimeRevocationStore = createDrizzleRealtimeRevocationStore();

export function getRealtimeRevocationStore(): RealtimeRevocationStore {
  return store;
}

export function setRealtimeRevocationStoreForTests(
  next: RealtimeRevocationStore
): void {
  store = next;
}

export function createInMemoryRealtimeRevocationStore(): RealtimeRevocationStore {
  const map = new Map<string, number>();
  return {
    async revoke(jti, expiresAtMs) {
      map.set(jti, expiresAtMs);
      rememberLocal(jti, expiresAtMs);
    },
    async isRevoked(jti) {
      const exp = map.get(jti);
      if (exp == null) return isRealtimeTicketRevokedLocal(jti);
      if (exp < Date.now()) {
        map.delete(jti);
        return false;
      }
      rememberLocal(jti, exp);
      return true;
    },
    clear() {
      map.clear();
      localRevoked.clear();
      localExpires.clear();
    },
  };
}
