/**
 * REALTIME-MULTI-INSTANCE-FANOUT-1
 * Shared cross-instance Realtime hint bus over TiDB/MySQL.
 * Preserves RealtimePubSub interface. Fail-open: domain never blocked.
 */

import { randomUUID } from "node:crypto";
import { gt, lt, asc } from "drizzle-orm";
import type { RealtimeHint } from "@shared/realtime-platform";
import {
  assertHintIsMetadataOnly,
  isRealtimeHintType,
} from "@shared/realtime-platform";
import { getDb } from "../../db";
import { realtimeBusMessages } from "../../../drizzle/schema";
import {
  InMemoryRealtimePubSub,
  type RealtimeBusSubscriber,
  type RealtimePubSub,
  type RealtimeTopic,
} from "./RealtimePubSub";

export type RealtimeBusStoreStatus =
  | "ok"
  | "degraded"
  | "disabled"
  | "unavailable";

export type RealtimeBusMessageRow = {
  id: bigint | number;
  eventId: string;
  originInstanceId: string;
  restaurantId: number;
  channel: string;
  hintJson: unknown;
  createdAt: Date;
};

/** Storage port — production uses TiDB; tests use in-memory shared store. */
export type RealtimeBusMessageStore = {
  insert(row: {
    eventId: string;
    originInstanceId: string;
    restaurantId: number;
    channel: string;
    hintJson: RealtimeHint;
  }): Promise<void>;
  listAfter(id: bigint, limit: number): Promise<RealtimeBusMessageRow[]>;
  deleteOlderThan(cutoff: Date): Promise<void>;
};

const DEFAULT_POLL_MS = 250;
const HINT_TTL_MS = 120_000;
const SEEN_CAP = 4_000;
const POLL_BATCH = 100;

export function resolveRealtimeInstanceId(): string {
  return (
    process.env.REALTIME_INSTANCE_ID?.trim() ||
    `rt_${randomUUID().slice(0, 12)}`
  );
}

export function isRealtimeSharedBusEnabled(): boolean {
  const raw = process.env.REALTIME_SHARED_BUS;
  if (raw === "false") return false;
  if (raw === "true") return true;
  return Boolean(process.env.DATABASE_URL);
}

function buildEventId(hint: RealtimeHint): string {
  if (hint.version && hint.version.length > 0) {
    return `v:${hint.version}:${hint.channel}:${hint.aggregateId ?? ""}:${hint.seq}`;
  }
  if (hint.correlationId && hint.correlationId.length > 0) {
    return `c:${hint.correlationId}:${hint.channel}:${hint.seq}`;
  }
  return `g:${randomUUID()}`;
}

function parseHintJson(raw: unknown): RealtimeHint | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Partial<RealtimeHint>;
  if (
    typeof h.type !== "string" ||
    !isRealtimeHintType(h.type) ||
    typeof h.channel !== "string" ||
    typeof h.restaurantId !== "number" ||
    typeof h.seq !== "number" ||
    typeof h.ts !== "string" ||
    typeof h.v !== "number"
  ) {
    return null;
  }
  try {
    assertHintIsMetadataOnly(h as RealtimeHint);
    return h as RealtimeHint;
  } catch {
    return null;
  }
}

export function createDrizzleRealtimeBusMessageStore(): RealtimeBusMessageStore {
  return {
    async insert(row) {
      const db = await getDb();
      if (!db) throw new Error("realtime_bus_db_unavailable");
      await db.insert(realtimeBusMessages).values({
        eventId: row.eventId,
        originInstanceId: row.originInstanceId,
        restaurantId: row.restaurantId,
        channel: row.channel,
        hintJson: row.hintJson,
      });
    },
    async listAfter(id, limit) {
      const db = await getDb();
      if (!db) throw new Error("realtime_bus_db_unavailable");
      return db
        .select()
        .from(realtimeBusMessages)
        .where(gt(realtimeBusMessages.id, id))
        .orderBy(asc(realtimeBusMessages.id))
        .limit(limit);
    },
    async deleteOlderThan(cutoff) {
      const db = await getDb();
      if (!db) return;
      await db
        .delete(realtimeBusMessages)
        .where(lt(realtimeBusMessages.createdAt, cutoff));
    },
  };
}

/** In-memory shared store for multi-instance unit tests (no TiDB). */
export function createInMemoryRealtimeBusMessageStore(): RealtimeBusMessageStore {
  const rows: RealtimeBusMessageRow[] = [];
  let seq = 0n;
  return {
    async insert(row) {
      seq += 1n;
      rows.push({
        id: seq,
        eventId: row.eventId,
        originInstanceId: row.originInstanceId,
        restaurantId: row.restaurantId,
        channel: row.channel,
        hintJson: row.hintJson,
        createdAt: new Date(),
      });
    },
    async listAfter(id, limit) {
      return rows.filter((r) => BigInt(r.id) > id).slice(0, limit);
    },
    async deleteOlderThan(cutoff) {
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        if (rows[i]!.createdAt < cutoff) rows.splice(i, 1);
      }
    },
  };
}

/**
 * Hybrid bus: local in-process delivery + shared store for other instances.
 * Loop prevention: eventId LRU — local publish marks seen; remote poll skips seen;
 * originInstanceId skip on poll avoids re-entry of own publishes.
 */
export class DatabaseRealtimePubSub implements RealtimePubSub {
  readonly instanceId: string;
  private readonly local = new InMemoryRealtimePubSub();
  private readonly store: RealtimeBusMessageStore;
  private readonly seen = new Set<string>();
  private readonly seenOrder: string[] = [];
  private lastId = 0n;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private subscriberCount = 0;
  private pollInflight: Promise<void> | null = null;
  private lastStoreStatus: RealtimeBusStoreStatus = "ok";
  private readonly pollMs: number;
  private readonly sharedEnabled: boolean;

  constructor(input?: {
    instanceId?: string;
    pollMs?: number;
    store?: RealtimeBusMessageStore;
    sharedEnabled?: boolean;
  }) {
    this.instanceId = input?.instanceId ?? resolveRealtimeInstanceId();
    this.pollMs = input?.pollMs ?? DEFAULT_POLL_MS;
    this.store = input?.store ?? createDrizzleRealtimeBusMessageStore();
    this.sharedEnabled = input?.sharedEnabled ?? isRealtimeSharedBusEnabled();
  }

  getStoreStatus(): RealtimeBusStoreStatus {
    if (!this.sharedEnabled) return "disabled";
    return this.lastStoreStatus;
  }

  async publish(hint: RealtimeHint): Promise<void> {
    const eventId = buildEventId(hint);
    if (this.sharedEnabled) {
      try {
        await this.store.insert({
          eventId,
          originInstanceId: this.instanceId,
          restaurantId: hint.restaurantId,
          channel: hint.channel,
          hintJson: hint,
        });
        this.lastStoreStatus = "ok";
        void this.store
          .deleteOlderThan(new Date(Date.now() - HINT_TTL_MS))
          .catch(() => undefined);
      } catch {
        this.lastStoreStatus = "degraded";
      }
    }

    this.deliverLocal(eventId, hint);
  }

  subscribe(
    topic: RealtimeTopic,
    subscriber: RealtimeBusSubscriber
  ): () => void {
    this.subscriberCount += 1;
    this.ensurePoller();
    const unsub = this.local.subscribe(topic, subscriber);
    return () => {
      unsub();
      this.subscriberCount = Math.max(0, this.subscriberCount - 1);
      if (this.subscriberCount === 0) this.stopPoller();
    };
  }

  close(): void {
    this.stopPoller();
    this.local.close();
    this.seen.clear();
    this.seenOrder.length = 0;
  }

  async pollOnceForTests(): Promise<void> {
    await this.poll();
  }

  private deliverLocal(eventId: string, hint: RealtimeHint): void {
    if (this.hasSeen(eventId)) return;
    this.markSeen(eventId);
    this.local.publish(hint);
  }

  private hasSeen(eventId: string): boolean {
    return this.seen.has(eventId);
  }

  private markSeen(eventId: string): void {
    if (this.seen.has(eventId)) return;
    this.seen.add(eventId);
    this.seenOrder.push(eventId);
    while (this.seenOrder.length > SEEN_CAP) {
      const old = this.seenOrder.shift();
      if (old) this.seen.delete(old);
    }
  }

  private ensurePoller(): void {
    if (!this.sharedEnabled) return;
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => {
      void this.poll();
    }, this.pollMs);
    const t = this.pollTimer as { unref?: () => void };
    if (typeof t.unref === "function") t.unref();
    void this.poll();
  }

  private stopPoller(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.pollInflight) return this.pollInflight;
    this.pollInflight = this.pollInner().finally(() => {
      this.pollInflight = null;
    });
    return this.pollInflight;
  }

  private async pollInner(): Promise<void> {
    if (!this.sharedEnabled) return;
    try {
      const rows = await this.store.listAfter(this.lastId, POLL_BATCH);
      for (const row of rows) {
        this.lastId = BigInt(row.id);
        if (row.originInstanceId === this.instanceId) {
          this.markSeen(row.eventId);
          continue;
        }
        const hint = parseHintJson(row.hintJson);
        if (!hint) continue;
        if (
          hint.restaurantId !== row.restaurantId ||
          hint.channel !== row.channel
        ) {
          continue;
        }
        this.deliverLocal(row.eventId, hint);
      }
      this.lastStoreStatus = "ok";
    } catch {
      this.lastStoreStatus = "degraded";
    }
  }
}

export function createRealtimePubSub(): RealtimePubSub & {
  getStoreStatus?: () => RealtimeBusStoreStatus;
  pollOnceForTests?: () => Promise<void>;
  instanceId?: string;
} {
  if (!isRealtimeSharedBusEnabled()) {
    return new InMemoryRealtimePubSub();
  }
  return new DatabaseRealtimePubSub();
}
