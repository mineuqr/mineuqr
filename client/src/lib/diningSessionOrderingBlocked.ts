/**
 * CUSTOMER-SESSION-LIFECYCLE-1F.1 — session-token-scoped expiry marker.
 * Blocks reuse of a specific closed session only; never blocks table/device permanently.
 */
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";

export type SessionTokenOrderingBlockedRecord = {
  sessionToken: string;
  endedStatus: DiningSessionStatus;
  blockedAt: string;
};

const TOKEN_PREFIX = "mineuqr:dining-session-ended-token:";
/** 1F table-scoped keys — removed on recovery (regression fix). */
const LEGACY_TABLE_PREFIX = "mineuqr:dining-session-ended:";

export function sessionTokenOrderingBlockedKey(sessionToken: string): string {
  return `${TOKEN_PREFIX}${sessionToken}`;
}

export function markSessionTokenOrderingBlocked(record: {
  sessionToken: string;
  endedStatus: DiningSessionStatus;
}): void {
  if (!record.sessionToken) return;
  const payload: SessionTokenOrderingBlockedRecord = {
    sessionToken: record.sessionToken,
    endedStatus: record.endedStatus,
    blockedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      sessionTokenOrderingBlockedKey(record.sessionToken),
      JSON.stringify(payload)
    );
  } catch {
    /* private mode / quota */
  }
}

export function loadSessionTokenOrderingBlocked(
  sessionToken: string
): SessionTokenOrderingBlockedRecord | null {
  if (!sessionToken || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(sessionTokenOrderingBlockedKey(sessionToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionTokenOrderingBlockedRecord>;
    if (!parsed.sessionToken || !parsed.endedStatus) return null;
    if (parsed.sessionToken !== sessionToken) return null;
    return {
      sessionToken: parsed.sessionToken,
      endedStatus: parsed.endedStatus,
      blockedAt: parsed.blockedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function isSessionTokenOrderingBlocked(sessionToken: string): boolean {
  return loadSessionTokenOrderingBlocked(sessionToken) != null;
}

/** Remove 1F table-scoped markers that permanently blocked devices. */
export function clearLegacyTableScopedOrderingBlocked(): void {
  if (typeof localStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(LEGACY_TABLE_PREFIX)) continue;
    if (key.startsWith(TOKEN_PREFIX)) continue;
    keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
}

/** For tests. */
export function resetSessionTokenOrderingBlockedForTests(): void {
  if (typeof localStorage === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key?.startsWith(TOKEN_PREFIX) ||
      (key?.startsWith(LEGACY_TABLE_PREFIX) && !key.startsWith(TOKEN_PREFIX))
    ) {
      keys.push(key);
    }
  }
  keys.forEach((key) => localStorage.removeItem(key));
}
