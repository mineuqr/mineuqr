/**
 * CUSTOMER-SESSION-LIFECYCLE-1F — client hint that table ordering ended.
 * Server is authoritative; this prevents stale tabs from re-enabling ordering after closure.
 */
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";

export type DiningSessionOrderingBlockedRecord = {
  slug: string;
  tableNumber: number;
  endedStatus: DiningSessionStatus;
  blockedAt: string;
};

const PREFIX = "mineuqr:dining-session-ended:";

export function diningSessionOrderingBlockedKey(slug: string, tableNumber: number): string {
  return `${PREFIX}${slug}:${tableNumber}`;
}

export function markDiningSessionOrderingBlocked(record: {
  slug: string;
  tableNumber: number;
  endedStatus: DiningSessionStatus;
}): void {
  if (!record.slug || record.tableNumber <= 0) return;
  const payload: DiningSessionOrderingBlockedRecord = {
    slug: record.slug,
    tableNumber: record.tableNumber,
    endedStatus: record.endedStatus,
    blockedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      diningSessionOrderingBlockedKey(record.slug, record.tableNumber),
      JSON.stringify(payload)
    );
  } catch {
    /* private mode / quota */
  }
}

export function loadDiningSessionOrderingBlocked(
  slug: string,
  tableNumber: number
): DiningSessionOrderingBlockedRecord | null {
  if (!slug || tableNumber <= 0 || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(diningSessionOrderingBlockedKey(slug, tableNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiningSessionOrderingBlockedRecord>;
    if (!parsed.slug || !parsed.tableNumber || !parsed.endedStatus) return null;
    if (parsed.slug !== slug || parsed.tableNumber !== tableNumber) return null;
    return {
      slug: parsed.slug,
      tableNumber: parsed.tableNumber,
      endedStatus: parsed.endedStatus,
      blockedAt: parsed.blockedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function isDiningSessionOrderingBlocked(slug: string, tableNumber: number): boolean {
  return loadDiningSessionOrderingBlocked(slug, tableNumber) != null;
}

export function clearDiningSessionOrderingBlocked(slug: string, tableNumber: number): void {
  if (!slug || tableNumber <= 0 || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(diningSessionOrderingBlockedKey(slug, tableNumber));
  } catch {
    /* ignore */
  }
}

/** For tests. */
export function resetDiningSessionOrderingBlockedForTests(): void {
  if (typeof localStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
