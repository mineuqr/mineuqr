import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
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
  billRequestedAt?: string | null;
  paymentPendingAt?: string | null;
};

/** Only `open` sessions allow placing new orders (TABLE-MANAGEMENT-1 D4). */
export function isDiningSessionOrderingEnabled(
  recoveredSession: RecoveredDiningSession | null
): boolean {
  return recoveredSession == null || recoveredSession.status === "open";
}

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

/** CUSTOMER-SESSION-LIFECYCLE-1A — closed sessions are terminal for customer recovery. */
export function isRecoverableDiningSession(
  session: RecoveredDiningSession | null
): session is RecoveredDiningSession {
  return session != null && session.status !== "closed";
}

/**
 * Tier 1: localStorage hint → getByToken.
 * Tier 2: getActiveByTable.
 * Server wins — persisted token always matches server response.
 * Closed sessions from tier 1 are discarded and tier 2 runs.
 */
export async function recoverDiningSession(options: {
  slug: string;
  tableNumber: number;
  client: DiningSessionRecoveryClient;
}): Promise<RecoveredDiningSession | null> {
  const { slug, tableNumber, client } = options;
  if (!slug || tableNumber <= 0) return null;

  const hint = loadDiningSession(slug, tableNumber);
  let session: RecoveredDiningSession | null = null;

  if (hint?.sessionToken) {
    try {
      session = await client.getByToken({ slug, sessionToken: hint.sessionToken });
    } catch {
      /* non-fatal — fall through to table lookup */
    }

    if (session?.status === "closed") {
      clearDiningSession(slug, tableNumber);
      session = null;
    }
  }

  if (!session) {
    try {
      session = await client.getActiveByTable({ slug, tableNumber });
    } catch {
      return null;
    }
  }

  if (isRecoverableDiningSession(session)) {
    saveDiningSession({
      sessionToken: session.sessionToken,
      slug,
      tableNumber,
    });
    return session;
  }

  if (hint) {
    clearDiningSession(slug, tableNumber);
  }

  return null;
}
