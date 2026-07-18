/**
 * TABLE-MANAGEMENT-1 D2 — dining session service (no router / order integration).
 * SETTLEMENT-ARCHITECTURE-1A — settlement foundation (markPaid / markComplimentary).
 */
import { getRestaurantById, getTableById, getOrdersBySessionId } from "../db";
import {
  findActiveSession,
  findSessionById,
  findSessionByToken,
  insertSession,
  insertSessionEvent,
  updateSessionStatus,
} from "./sessionRepository";
import {
  createOpenCheckForSession,
  settleCheckComplimentary,
  settleCheckPaid,
  voidCheck,
} from "../operational-session/check/CheckService";
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
import { getDb } from "../db";
import { computeOrdersTotalAmount } from "./sessionOrderTotals";
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

/** SETTLEMENT-ARCHITECTURE-1A — settlement records outcome then auto-closes session. */
async function settleAndCloseSession(
  session: SelectDiningSession,
  settlement: DiningSessionSettlementOutcome,
  metadata: Record<string, unknown>,
  settlements?: readonly StaffSettlementLineInput[]
): Promise<void> {
  if (session.status !== "open") {
    throw new DiningSessionTransitionError(
      "Only open sessions can be settled"
    );
  }

  const now = formatDiningSessionTimestamp();
  const orderRows = await getOrdersBySessionId(session.restaurantId, session.id);
  const settlementEventType =
    settlement === "paid"
      ? TABLE_EVENT_TYPES.SESSION_PAID
      : TABLE_EVENT_TYPES.SESSION_COMPLIMENTARY;

  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }

  const closureMetadata = {
    ...metadata,
    settlement,
    tableNumber: session.tableNumber,
    orderCount: orderRows.length,
    ordersTotalAmount: computeOrdersTotalAmount(orderRows),
  };

  // CHECK-MANAGEMENT-ARCHITECTURE-1 — finalize Check before Session settle/close.
  // SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — pass operator tenders when provided.
  const check =
    settlement === "paid"
      ? await settleCheckPaid({
          restaurantId: session.restaurantId,
          sessionId: session.id,
          settlements,
        })
      : await settleCheckComplimentary({
          restaurantId: session.restaurantId,
          sessionId: session.id,
        });

  const checkMetadata = {
    ...closureMetadata,
    checkId: check.id,
    checkGrandTotal: check.grandTotal,
    checkTaxAmount: check.taxAmount,
  };

  await db.transaction(async (tx) => {
    await updateSessionStatus(
      {
        restaurantId: session.restaurantId,
        sessionId: session.id,
        status: settlement,
        settledAt: now,
        settlementOutcome: settlement,
      },
      tx
    );

    await insertSessionEvent(
      {
        restaurantId: session.restaurantId,
        tableId: session.tableId,
        sessionId: session.id,
        eventType: settlementEventType,
        metadata: checkMetadata,
      },
      tx
    );

    await updateSessionStatus(
      {
        restaurantId: session.restaurantId,
        sessionId: session.id,
        status: "closed",
        settledAt: now,
        settlementOutcome: settlement,
        closedAt: now,
        openGuard: null,
      },
      tx
    );

    await insertSessionEvent(
      {
        restaurantId: session.restaurantId,
        tableId: session.tableId,
        sessionId: session.id,
        eventType: TABLE_EVENT_TYPES.SESSION_CLOSED,
        metadata: {
          ...checkMetadata,
          source: "settlement",
        },
      },
      tx
    );
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

/** SETTLEMENT-ARCHITECTURE-1A — staff marks session paid (open → paid → closed). */
export async function markPaid(input: MarkPaidInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);

  await settleAndCloseSession(
    session,
    "paid",
    {
      source: "staff",
      actorUserId: input.actorUserId,
    },
    input.settlements
  );
}

/** SETTLEMENT-ARCHITECTURE-1A — staff marks session complimentary (open → complimentary → closed). */
export async function markComplimentary(input: StaffSessionActionInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);

  await settleAndCloseSession(session, "complimentary", {
    source: "staff",
    actorUserId: input.actorUserId,
  });
}

/** Administrative override — close without settlement (open → closed). */
export async function closeSession(input: StaffSessionActionInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);
  const now = formatDiningSessionTimestamp();
  const orderRows = await getOrdersBySessionId(input.restaurantId, input.sessionId);

  // CHECK-MANAGEMENT-ARCHITECTURE-1 — void open Check when closing without settle.
  let voidedCheckId: number | null = null;
  try {
    const voided = await voidCheck({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
    });
    voidedCheckId = voided.id;
  } catch {
    /* no open check / already terminal — Session close still proceeds */
  }

  await applySessionTransition(
    session,
    "closed",
    TABLE_EVENT_TYPES.SESSION_CLOSED,
    {
      actorUserId: input.actorUserId,
      tableNumber: session.tableNumber,
      source: "manual_close",
      orderCount: orderRows.length,
      ordersTotalAmount: computeOrdersTotalAmount(orderRows),
      checkId: voidedCheckId,
    },
    { closedAt: now, openGuard: null, settledAt: null, settlementOutcome: null }
  );
}

/** Exported for unit tests. */
export function isAllowedSessionStatusTransition(
  from: DiningSessionStatus,
  to: DiningSessionStatus
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
