/**
 * TABLE-MANAGEMENT-1 D2 — dining session service (no router / order integration).
 * SETTLEMENT-ARCHITECTURE-1A — settlement foundation (markPaid / markComplimentary).
 */
import { getDb, getRestaurantById, getTableById } from "../db";
import {
  findActiveSession,
  findSessionById,
  findSessionByToken,
  insertSession,
  insertSessionEvent,
  updateSessionStatus,
} from "./sessionRepository";
import { createOpenCheckForSession } from "../operational-session/check/CheckService";
import { assertSessionCloseable } from "../operational-session/check/lifecycleSettlementGuardService";
import { generateDiningSessionToken } from "./sessionToken";
import {
  DiningSessionConflictError,
  DiningSessionExpiredError,
  DiningSessionNotFoundError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  DiningSessionTransitionError,
  DINING_SESSION_ACTIVE_OPEN_GUARD,
  isTerminalDiningSessionStatus,
  TABLE_EVENT_TYPES,
  TABLE_EVENT_TYPE_VALUES,
  type DiningSessionSettlementOutcome,
  type GetActiveSessionInput,
  type GetOrCreateSessionInput,
  type GetOrCreateSessionResult,
  type RecordSessionEventInput,
  type RecordSessionEventResult,
  type TableEventType,
  type DiningSessionStatus,
  formatDiningSessionTimestamp,
  isMysqlDuplicateKeyError,
} from "./sessionTypes";
import type { SelectDiningSession } from "../../drizzle/schema";
import type { StaffSettlementLineInput } from "@shared/operational-session";

const ALLOWED_STATUS_TRANSITIONS: Record<DiningSessionStatus, DiningSessionStatus[]> = {
  open: ["paid", "complimentary", "closed"],
  paid: ["closed"],
  complimentary: ["closed"],
  closed: [],
};

export type StaffSessionActionInput = {
  restaurantId: number;
  sessionId: number;
  actorUserId: number;
};

/** SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — Mark Paid with optional tender lines. */
export type MarkPaidInput = StaffSessionActionInput & {
  /**
   * Operator settlement tenders. When omitted, Check domain keeps legacy
   * DEFAULT_PAID_PAYMENT_METHOD = "other" for backward compatibility.
   */
  settlements?: readonly StaffSettlementLineInput[];
  /**
   * SETTLEMENT-CONTEXT-ADOPTION-1 — optional operational hints (fail-open).
   * Never fabricates Register/Shift when absent.
   */
  registerId?: string | null;
  deviceId?: string | null;
  operationalScreenId?: string | null;
};

export type StaffSessionActionWithContextInput = StaffSessionActionInput & {
  registerId?: string | null;
  deviceId?: string | null;
  operationalScreenId?: string | null;
};

function assertValidSessionActionInput(input: StaffSessionActionInput): void {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new DiningSessionValidationError("Invalid restaurantId");
  }
  if (!Number.isInteger(input.sessionId) || input.sessionId <= 0) {
    throw new DiningSessionValidationError("Invalid sessionId");
  }
  if (!Number.isInteger(input.actorUserId) || input.actorUserId <= 0) {
    throw new DiningSessionValidationError("Invalid actorUserId");
  }
}

function assertStatusTransition(from: DiningSessionStatus, to: DiningSessionStatus): void {
  if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
    throw new DiningSessionTransitionError(
      `Cannot transition session from ${from} to ${to}`
    );
  }
}

async function loadSessionForStaffAction(
  restaurantId: number,
  sessionId: number
): Promise<SelectDiningSession> {
  const session = await findSessionById(sessionId);
  if (!session || session.restaurantId !== restaurantId) {
    throw new DiningSessionNotFoundError();
  }
  if (session.status === "closed") {
    throw new DiningSessionTransitionError("Session is closed");
  }
  return session;
}

async function applySessionTransition(
  session: SelectDiningSession,
  toStatus: DiningSessionStatus,
  eventType: TableEventType | null,
  metadata: Record<string, unknown>,
  patch: {
    settledAt?: string | null;
    settlementOutcome?: DiningSessionSettlementOutcome | null;
    closedAt?: string | null;
    openGuard?: number | null;
  }
): Promise<void> {
  const fromStatus = session.status as DiningSessionStatus;
  assertStatusTransition(fromStatus, toStatus);

  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }

  await db.transaction(async (tx) => {
    await updateSessionStatus(
      {
        restaurantId: session.restaurantId,
        sessionId: session.id,
        status: toStatus,
        ...patch,
      },
      tx
    );

    if (eventType) {
      await insertSessionEvent(
        {
          restaurantId: session.restaurantId,
          tableId: session.tableId,
          sessionId: session.id,
          eventType,
          metadata,
        },
        tx
      );
    }
  });
}

async function validateTableContext(input: {
  restaurantId: number;
  tableId: number;
  tableNumber: number;
}): Promise<void> {
  const restaurant = await getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new DiningSessionValidationError("Restaurant not found");
  }
  if (!restaurant.isActive) {
    throw new DiningSessionValidationError("Restaurant is not active");
  }

  const table = await getTableById(input.tableId);
  if (!table) {
    throw new DiningSessionValidationError("Table not found");
  }
  if (table.restaurantId !== input.restaurantId) {
    throw new DiningSessionValidationError("Table does not belong to restaurant");
  }
  if (table.tableNumber !== input.tableNumber) {
    throw new DiningSessionValidationError("Table number mismatch");
  }
  if (!table.isActive) {
    throw new DiningSessionValidationError("Table is not active");
  }
}

function isAllowedEventType(eventType: string): eventType is TableEventType {
  return (TABLE_EVENT_TYPE_VALUES as readonly string[]).includes(eventType);
}

/** Internal — not exported. Opens session + SESSION_OPENED in one transaction. */
async function createSession(input: GetOrCreateSessionInput): Promise<{
  session: SelectDiningSession;
  created: true;
}> {
  await validateTableContext(input);

  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }

  const sessionToken = generateDiningSessionToken();
  const openedAt = formatDiningSessionTimestamp();

  try {
    const sessionId = await db.transaction(async (tx) => {
      const id = await insertSession(
        {
          restaurantId: input.restaurantId,
          tableId: input.tableId,
          tableNumber: input.tableNumber,
          sessionToken,
          openedAt,
        },
        tx
      );

      await insertSessionEvent(
        {
          restaurantId: input.restaurantId,
          tableId: input.tableId,
          sessionId: id,
          eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
          metadata: {
            source: "get_or_create",
            tableNumber: input.tableNumber,
          },
        },
        tx
      );

      // CHECK-MANAGEMENT-ARCHITECTURE-1 — create Open Check with frozen snapshots.
      await createOpenCheckForSession(
        { restaurantId: input.restaurantId, sessionId: id },
        tx
      );

      return id;
    });

    const session = await findSessionById(sessionId);
    if (!session) {
      throw new DiningSessionUnavailableError("Session not found after creation");
    }

    return { session, created: true };
  } catch (err) {
    if (isMysqlDuplicateKeyError(err)) {
      throw new DiningSessionConflictError();
    }
    throw err;
  }
}

export async function getActiveSession(
  input: GetActiveSessionInput
): Promise<SelectDiningSession | null> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new DiningSessionValidationError("Invalid restaurantId");
  }
  if (!Number.isInteger(input.tableId) || input.tableId <= 0) {
    throw new DiningSessionValidationError("Invalid tableId");
  }

  return findActiveSession(input.restaurantId, input.tableId);
}

export async function getOrCreateSession(
  input: GetOrCreateSessionInput
): Promise<GetOrCreateSessionResult> {
  if (!Number.isInteger(input.tableNumber) || input.tableNumber <= 0) {
    throw new DiningSessionValidationError("Invalid tableNumber");
  }

  await validateTableContext(input);

  const existing = await findActiveSession(input.restaurantId, input.tableId);
  if (existing) {
    if (existing.activeCheckId == null) {
      try {
        await createOpenCheckForSession({
          restaurantId: input.restaurantId,
          sessionId: existing.id,
        });
      } catch {
        /* best-effort */
      }
      const refreshed = await findSessionById(existing.id);
      if (refreshed) return { session: refreshed, created: false };
    }
    return { session: existing, created: false };
  }

  try {
    const created = await createSession(input);
    return { session: created.session, created: true };
  } catch (err) {
    if (
      err instanceof DiningSessionConflictError ||
      isMysqlDuplicateKeyError(err)
    ) {
      const winner = await findActiveSession(input.restaurantId, input.tableId);
      if (winner) {
        return { session: winner, created: false };
      }
    }
    throw err;
  }
}

export type ResolveSessionForOrderInput = GetOrCreateSessionInput & {
  sessionToken?: string;
};

/**
 * CUSTOMER-SESSION-LIFECYCLE-1F — authoritative session resolution for order.create.
 * Reuses active open sessions; rejects terminal hinted tokens; opens new sessions only when allowed.
 */
export async function resolveSessionForOrderCreate(
  input: ResolveSessionForOrderInput
): Promise<GetOrCreateSessionResult> {
  if (!Number.isInteger(input.tableNumber) || input.tableNumber <= 0) {
    throw new DiningSessionValidationError("Invalid tableNumber");
  }

  await validateTableContext(input);

  const active = await findActiveSession(input.restaurantId, input.tableId);
  if (active) {
    // CHECK-MANAGEMENT-ARCHITECTURE-1 — ensure legacy open sessions gain a Check.
    if (active.activeCheckId == null) {
      try {
        await createOpenCheckForSession({
          restaurantId: input.restaurantId,
          sessionId: active.id,
        });
      } catch {
        /* best-effort; settle path also ensures */
      }
      const refreshed = await findSessionById(active.id);
      if (refreshed) {
        return { session: refreshed, created: false };
      }
    }
    return { session: active, created: false };
  }

  if (input.sessionToken) {
    const hinted = await findSessionByToken(input.restaurantId, input.sessionToken);
    if (hinted) {
      if (hinted.tableId !== input.tableId) {
        throw new DiningSessionValidationError("Session does not match table");
      }
      if (
        isTerminalDiningSessionStatus(hinted.status) ||
        hinted.openGuard !== DINING_SESSION_ACTIVE_OPEN_GUARD
      ) {
        throw new DiningSessionExpiredError();
      }
    }
  }

  return getOrCreateSession(input);
}

export async function recordSessionEvent(
  input: RecordSessionEventInput
): Promise<RecordSessionEventResult> {
  if (!isAllowedEventType(input.eventType)) {
    throw new DiningSessionValidationError(`Unsupported event type: ${input.eventType}`);
  }
  if (!Number.isInteger(input.sessionId) || input.sessionId <= 0) {
    throw new DiningSessionValidationError("Invalid sessionId");
  }
  if (input.orderId != null && (!Number.isInteger(input.orderId) || input.orderId <= 0)) {
    throw new DiningSessionValidationError("Invalid orderId");
  }
  if (input.eventType === TABLE_EVENT_TYPES.ORDER_CREATED && input.orderId == null) {
    throw new DiningSessionValidationError("orderId is required for ORDER_CREATED");
  }

  const session = await findSessionById(input.sessionId);
  if (!session) {
    throw new DiningSessionNotFoundError();
  }
  if (
    session.restaurantId !== input.restaurantId ||
    session.tableId !== input.tableId
  ) {
    throw new DiningSessionNotFoundError();
  }

  const eventId = await insertSessionEvent({
    restaurantId: input.restaurantId,
    tableId: input.tableId,
    sessionId: input.sessionId,
    orderId: input.orderId,
    eventType: input.eventType,
    metadata: input.metadata,
  });

  return { eventId };
}

/** UNIFIED-POS-FINANCIAL-AUTHORITY-1 — money is Cashier Confirm only. */
export async function markPaid(input: MarkPaidInput): Promise<void> {
  assertValidSessionActionInput(input);
  await loadSessionForStaffAction(input.restaurantId, input.sessionId);
  throw new DiningSessionValidationError(
    "Financial settlement requires Cashier Confirm"
  );
}

/** UNIFIED-POS-FINANCIAL-AUTHORITY-1 — complimentary money is Cashier Confirm only. */
export async function markComplimentary(
  input: StaffSessionActionWithContextInput
): Promise<void> {
  assertValidSessionActionInput(input);
  await loadSessionForStaffAction(input.restaurantId, input.sessionId);
  throw new DiningSessionValidationError(
    "Financial settlement requires Cashier Confirm"
  );
}

/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — close Session only after financial completion.
 * Requires associated Check outcome paid | complimentary.
 * Never auto-settles. Never voids unpaid Checks as a close shortcut.
 */
export async function closeSession(
  input: StaffSessionActionWithContextInput
): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);
  const now = formatDiningSessionTimestamp();

  const settled = await assertSessionCloseable({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
  });

  const settlementOutcome =
    settled.outcome === "complimentary" ? "complimentary" : "paid";

  await applySessionTransition(
    session,
    "closed",
    TABLE_EVENT_TYPES.SESSION_CLOSED,
    {
      actorUserId: input.actorUserId,
      tableNumber: session.tableNumber,
      source: "manual_close",
      orderCount: session.totalOrders ?? 0,
      checkId: settled.checkId,
      settlement: settlementOutcome,
    },
    {
      closedAt: now,
      openGuard: null,
      settledAt: session.settledAt ?? now,
      settlementOutcome:
        (session.settlementOutcome as DiningSessionSettlementOutcome | null) ??
        settlementOutcome,
    }
  );
}

/** Exported for unit tests. */
export function isAllowedSessionStatusTransition(
  from: DiningSessionStatus,
  to: DiningSessionStatus
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
