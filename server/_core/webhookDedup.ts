import { opsLog } from "./opsLog";
import { OPS_EVENT } from "./opsTaxonomy";

type Provider = "tap" | "paypal";

type Entry = {
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
  lastEmittedAt?: number;
};

const MAX_KEYS = 5000;
const WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours
const CLEANUP_INTERVAL_MS = 60 * 1000;
const DUPLICATE_EMIT_COOLDOWN_MS = 2 * 60 * 1000;

let lastCleanup = Date.now();
const entries = new Map<string, Entry>();

function key(provider: Provider, providerEventId: string): string {
  return `${provider}:${providerEventId}`;
}

function cleanup(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [k, e] of Array.from(entries.entries())) {
    if (now - e.lastSeenAt > WINDOW_MS) entries.delete(k);
  }

  if (entries.size <= MAX_KEYS) return;
  const sorted = Array.from(entries.entries()).sort(
    (a, b) => a[1].lastSeenAt - b[1].lastSeenAt
  );
  const toRemove = entries.size - MAX_KEYS;
  for (let i = 0; i < toRemove; i++) entries.delete(sorted[i]![0]);
}

export type DedupResult = {
  isDuplicate: boolean;
  count: number;
};

/**
 * Visibility-only duplicate detector (MON-1R.1).
 *
 * - In-memory + bounded cleanup
 * - Does NOT block processing; only emits a warning signal when duplicates appear
 */
export function noteWebhookEvent(input: {
  provider: Provider;
  providerEventId: string;
  correlationId?: string;
  eventType?: string;
  procedure?: string;
  route?: string;
  ip?: string;
  method?: string;
  metadata?: Record<string, unknown>;
}): DedupResult {
  const now = Date.now();
  cleanup(now);

  const k = key(input.provider, input.providerEventId);
  let e = entries.get(k);
  if (!e) {
    e = { firstSeenAt: now, lastSeenAt: now, count: 0 };
    entries.set(k, e);
  }

  e.count += 1;
  e.lastSeenAt = now;

  const isDuplicate = e.count > 1;
  if (isDuplicate) {
    const lastEmitted = e.lastEmittedAt ?? 0;
    if (now - lastEmitted >= DUPLICATE_EMIT_COOLDOWN_MS) {
      e.lastEmittedAt = now;
      opsLog({
        type: OPS_EVENT.duplicate_webhook_detected,
        category: "WEBHOOK",
        severity: "warn",
        ts: new Date(now).toISOString(),
        correlationId: input.correlationId,
        route: input.route,
        procedure: input.procedure,
        ip: input.ip,
        method: input.method,
        metadata: {
          provider: input.provider,
          providerEventId: input.providerEventId,
          eventType: input.eventType,
          duplicateCount: e.count,
          windowMs: WINDOW_MS,
          firstSeenAt: new Date(e.firstSeenAt).toISOString(),
          ...input.metadata,
        },
      });
    }
  }

  return { isDuplicate, count: e.count };
}

