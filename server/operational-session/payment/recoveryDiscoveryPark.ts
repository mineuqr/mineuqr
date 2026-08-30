/**
 * RECOVERY-DISCOVERY-STARVATION-HARDENING-1
 * Process-local discovery park. No schema. Source CF / Outbox rows are not deleted.
 *
 * Permanent: excluded until process restart (no supported reactivation writer).
 * Deferred / retryable: excluded until resumeAt, then re-enter active discovery.
 */

export type DrawerAttributionParkClass =
  | "permanently_unrecoverable"
  | "deferred"
  | "retryable";

export type ParkedDrawerAttribution = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  classification: DrawerAttributionParkClass;
  gaps: readonly string[];
  reason: string;
  parkedAt: string;
  resumeAtMs: number | null;
}>;

export const DRAWER_ATTRIBUTION_DEFERRED_RESUME_MS = 10 * 60 * 1000;
export const DRAWER_ATTRIBUTION_RETRYABLE_RESUME_MS = 60 * 1000;

const parked = new Map<string, ParkedDrawerAttribution>();

export function parkDrawerAttributionDiscovery(
  entry: Omit<ParkedDrawerAttribution, "parkedAt" | "resumeAtMs"> & {
    nowMs?: number;
  }
): ParkedDrawerAttribution {
  const nowMs = entry.nowMs ?? Date.now();
  const parkedAt = new Date(nowMs).toISOString();
  const resumeAtMs =
    entry.classification === "permanently_unrecoverable"
      ? null
      : nowMs +
        (entry.classification === "deferred"
          ? DRAWER_ATTRIBUTION_DEFERRED_RESUME_MS
          : DRAWER_ATTRIBUTION_RETRYABLE_RESUME_MS);
  const record: ParkedDrawerAttribution = {
    collectionFactId: entry.collectionFactId,
    restaurantId: entry.restaurantId,
    classification: entry.classification,
    gaps: [...entry.gaps],
    reason: entry.reason,
    parkedAt,
    resumeAtMs,
  };
  parked.set(entry.collectionFactId, record);
  return record;
}

export function listActiveParkedDrawerAttributionFactIds(
  nowMs = Date.now()
): string[] {
  const ids: string[] = [];
  for (const [id, row] of parked) {
    if (row.resumeAtMs != null && row.resumeAtMs <= nowMs) {
      parked.delete(id);
      continue;
    }
    ids.push(id);
  }
  return ids;
}

export function getParkedDrawerAttribution(
  collectionFactId: string
): ParkedDrawerAttribution | undefined {
  return parked.get(collectionFactId);
}

export type ParkedCheckDownstream = Readonly<{
  restaurantId: number;
  orderId: number;
  classification: DrawerAttributionParkClass;
  gaps: readonly string[];
  reason: string;
  parkedAt: string;
  resumeAtMs: number | null;
}>;

const parkedCheck = new Map<string, ParkedCheckDownstream>();

function checkParkKey(restaurantId: number, orderId: number): string {
  return `${restaurantId}:${orderId}`;
}

export function parkCheckDownstreamDiscovery(
  entry: Omit<ParkedCheckDownstream, "parkedAt" | "resumeAtMs"> & {
    nowMs?: number;
  }
): ParkedCheckDownstream {
  const nowMs = entry.nowMs ?? Date.now();
  const parkedAt = new Date(nowMs).toISOString();
  const resumeAtMs =
    entry.classification === "permanently_unrecoverable"
      ? null
      : nowMs +
        (entry.classification === "deferred"
          ? DRAWER_ATTRIBUTION_DEFERRED_RESUME_MS
          : DRAWER_ATTRIBUTION_RETRYABLE_RESUME_MS);
  const record: ParkedCheckDownstream = {
    restaurantId: entry.restaurantId,
    orderId: entry.orderId,
    classification: entry.classification,
    gaps: [...entry.gaps],
    reason: entry.reason,
    parkedAt,
    resumeAtMs,
  };
  parkedCheck.set(checkParkKey(entry.restaurantId, entry.orderId), record);
  return record;
}

export function listActiveParkedCheckOrderIds(nowMs = Date.now()): number[] {
  const ids: number[] = [];
  for (const [key, row] of parkedCheck) {
    if (row.resumeAtMs != null && row.resumeAtMs <= nowMs) {
      parkedCheck.delete(key);
      continue;
    }
    ids.push(row.orderId);
  }
  return ids;
}

export function getParkedCheckDownstream(
  restaurantId: number,
  orderId: number
): ParkedCheckDownstream | undefined {
  return parkedCheck.get(checkParkKey(restaurantId, orderId));
}

export function resetDrawerAttributionDiscoveryParkForTests(): void {
  parked.clear();
  parkedCheck.clear();
}
