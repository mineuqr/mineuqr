/**
 * TABLE-MANAGEMENT-1 D4 + CUSTOMER-SESSION-LIFECYCLE-1F / 1F.1 — dining session recovery.
 */
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import type { DiningSessionRecoveryMode } from "@/lib/diningSessionRevalidation";
import {
  clearLegacyTableScopedOrderingBlocked,
  markSessionTokenOrderingBlocked,
} from "@/lib/diningSessionOrderingBlocked";
import {
  clearDiningSession,
  loadDiningSession,
  saveDiningSession,
} from "@/lib/diningSessionStorage";

export type RecoveredDiningSession = {
  sessionToken: string;
  status: DiningSessionStatus;
  tableNumber: number;
  openedAt: string;
};

export type DiningSessionRecoveryResult = {
  session: RecoveredDiningSession | null;
  sessionEnded: boolean;
  endedStatus?: DiningSessionStatus;
};

/** Terminal session states — not recoverable for customer ordering. */
const TERMINAL_SESSION_STATUSES: DiningSessionStatus[] = ["closed", "paid", "complimentary"];

export type DiningSessionRecoveryClient = {
  getByToken: (input: {
    slug: string;
    sessionToken: string;
  }) => Promise<RecoveredDiningSession | null>;
  getActiveByTable: (input: {
    slug: string;
    tableNumber: number;
  }) => Promise<RecoveredDiningSession | null>;
};

/** SETTLEMENT-ARCHITECTURE-1A — only open sessions are recoverable. */
export function isRecoverableDiningSession(
  session: RecoveredDiningSession | null
): session is RecoveredDiningSession {
  return session != null && session.status === "open";
}

/** Active open session or fresh table visit (no ended session in this visit). */
export function isDiningSessionOrderingEnabled(
  recovery: DiningSessionRecoveryResult
): boolean {
  if (recovery.sessionEnded) return false;
  if (recovery.session?.status === "open") return true;
  return recovery.session == null;
}

/**
 * Tier 1: localStorage hint → getByToken.
 * Tier 2: getActiveByTable.
 * Terminal tokens are marked session-scoped; ordering blocked only on revalidate (stale tab).
 */
export async function recoverDiningSession(options: {
  slug: string;
  tableNumber: number;
  client: DiningSessionRecoveryClient;
  mode?: DiningSessionRecoveryMode;
}): Promise<DiningSessionRecoveryResult> {
  const { slug, tableNumber, client, mode = "initial" } = options;
  if (!slug || tableNumber <= 0) {
    return { session: null, sessionEnded: false };
  }

  if (mode === "initial") {
    clearLegacyTableScopedOrderingBlocked();
  }

  const hint = loadDiningSession(slug, tableNumber);
  let session: RecoveredDiningSession | null = null;
  let terminalStatus: DiningSessionStatus | undefined;
  let terminalToken: string | undefined;

  if (hint?.sessionToken) {
    try {
      session = await client.getByToken({ slug, sessionToken: hint.sessionToken });
    } catch {
      /* non-fatal — fall through to table lookup */
    }

    if (session && TERMINAL_SESSION_STATUSES.includes(session.status)) {
      terminalToken = hint.sessionToken;
      terminalStatus = session.status;
      markSessionTokenOrderingBlocked({
        sessionToken: hint.sessionToken,
        endedStatus: session.status,
      });
      clearDiningSession(slug, tableNumber);
      session = null;
    }
  }

  if (!session) {
    try {
      session = await client.getActiveByTable({ slug, tableNumber });
    } catch {
      return {
        session: null,
        sessionEnded: mode === "revalidate" && terminalStatus != null,
        endedStatus: terminalStatus,
      };
    }
  }

  if (isRecoverableDiningSession(session)) {
    saveDiningSession({
      sessionToken: session.sessionToken,
      slug,
      tableNumber,
    });
    return { session, sessionEnded: false };
  }

  if (hint && !terminalToken) {
    clearDiningSession(slug, tableNumber);
  }

  const sessionEnded = mode === "revalidate" && terminalStatus != null;
  return {
    session: null,
    sessionEnded,
    endedStatus: sessionEnded ? terminalStatus : undefined,
  };
}
