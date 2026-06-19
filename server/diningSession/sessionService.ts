/**
 * TABLE-MANAGEMENT-1 D2 — dining session service (no router / order integration).
 * SETTLEMENT-ARCHITECTURE-1A — settlement foundation (markPaid / markComplimentary).
 */
import { getRestaurantById, getTableById, getOrdersBySessionId } from "../db";
import {
  findActiveSession,
  findSessionById,
  insertSession,
  insertSessionEvent,
  updateSessionStatus,
} from "./sessionRepository";
import { generateDiningSessionToken } from "./sessionToken";
import {
  DiningSessionConflictError,
  DiningSessionNotFoundError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  DiningSessionTransitionError,
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
  metadata: Record<string, unknown>
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
        metadata: closureMetadata,
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
          ...closureMetadata,
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
export async function markPaid(input: StaffSessionActionInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);

  await settleAndCloseSession(session, "paid", {
    source: "staff",
    actorUserId: input.actorUserId,
  });
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
