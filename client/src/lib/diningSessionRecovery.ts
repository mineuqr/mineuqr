/**
 * TABLE-MANAGEMENT-1 D4 + CUSTOMER-SESSION-LIFECYCLE-1F — dining session recovery.
 */
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import {
  clearDiningSessionOrderingBlocked,
  loadDiningSessionOrderingBlocked,
  markDiningSessionOrderingBlocked,
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

/** Only active open sessions or fresh table visits allow placing new orders. */
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
 * Server wins — persisted token always matches server response.
 * Terminal sessions mark local ordering blocked and are not recoverable.
 */
export async function recoverDiningSession(options: {
  slug: string;
  tableNumber: number;
  client: DiningSessionRecoveryClient;
}): Promise<DiningSessionRecoveryResult> {
  const { slug, tableNumber, client } = options;
  if (!slug || tableNumber <= 0) {
    return { session: null, sessionEnded: false };
  }

  const blocked = loadDiningSessionOrderingBlocked(slug, tableNumber);
  const hint = loadDiningSession(slug, tableNumber);
  let session: RecoveredDiningSession | null = null;
  let endedStatus: DiningSessionStatus | undefined = blocked?.endedStatus;

  if (hint?.sessionToken) {
    try {
      session = await client.getByToken({ slug, sessionToken: hint.sessionToken });
    } catch {
      /* non-fatal — fall through to table lookup */
    }

    if (session && TERMINAL_SESSION_STATUSES.includes(session.status)) {
      endedStatus = session.status;
      markDiningSessionOrderingBlocked({ slug, tableNumber, endedStatus: session.status });
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
        sessionEnded: blocked != null || endedStatus != null,
        endedStatus,
      };
    }
  }

  if (isRecoverableDiningSession(session)) {
    clearDiningSessionOrderingBlocked(slug, tableNumber);
    saveDiningSession({
      sessionToken: session.sessionToken,
      slug,
      tableNumber,
    });
    return { session, sessionEnded: false };
  }

  if (hint) {
    clearDiningSession(slug, tableNumber);
  }

  const sessionEnded = blocked != null || endedStatus != null;
  return {
    session: null,
    sessionEnded,
    endedStatus,
  };
}
