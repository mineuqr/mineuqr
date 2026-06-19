/**
 * TABLE-MANAGEMENT-1 D2 — dining session service (no router / order integration).
 */
import { getRestaurantById, getRestaurantBySlug, getTableById, getOrdersBySessionId } from "../db";
import {
  findActiveSession,
  findSessionById,
  findSessionByToken,
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
import { computeOrdersTotalAmount } from "./sessionOwnerWorkspace";
import {
  isValidSessionTokenFormat,
  toPublicDiningSession,
  type PublicDiningSession,
} from "./sessionPublicStatus";

const ALLOWED_STATUS_TRANSITIONS: Record<DiningSessionStatus, DiningSessionStatus[]> = {
  open: ["bill_requested", "closed"],
  bill_requested: ["open", "payment_pending", "closed"],
  payment_pending: ["closed"],
  closed: [],
};

export type StaffSessionActionInput = {
  restaurantId: number;
  sessionId: number;
  actorUserId: number;
};

export type CustomerRequestBillInput = {
  slug: string;
  sessionToken: string;
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
    billRequestedAt?: string | null;
    paymentPendingAt?: string | null;
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

async function transitionOpenToBillRequested(
  session: SelectDiningSession,
  metadata: Record<string, unknown>
): Promise<void> {
  const now = formatDiningSessionTimestamp();
  await applySessionTransition(
    session,
    "bill_requested",
    TABLE_EVENT_TYPES.BILL_REQUESTED,
    metadata,
    { billRequestedAt: now }
  );
}

async function validateCustomerSessionContext(
  input: CustomerRequestBillInput
): Promise<SelectDiningSession> {
  if (!isValidSessionTokenFormat(input.sessionToken)) {
    throw new DiningSessionNotFoundError();
  }

  const restaurant = await getRestaurantBySlug(input.slug);
  if (!restaurant?.isActive) {
    throw new DiningSessionNotFoundError();
  }

  const session = await findSessionByToken(restaurant.id, input.sessionToken);
  if (!session) {
    throw new DiningSessionNotFoundError();
  }

  if (session.tableNumber <= 0) {
    throw new DiningSessionNotFoundError();
  }

  return session;
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

/** UX-1D — staff initiates bill request (open → bill_requested). */
export async function requestBill(input: StaffSessionActionInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);

  await transitionOpenToBillRequested(session, {
    source: "staff",
    actorUserId: input.actorUserId,
    tableNumber: session.tableNumber,
  });
}

/** UX-1E — customer requests bill (open → bill_requested, idempotent when already requested). */
export async function requestBillByCustomer(
  input: CustomerRequestBillInput
): Promise<PublicDiningSession> {
  const session = await validateCustomerSessionContext(input);

  if (session.status === "bill_requested") {
    return toPublicDiningSession(session);
  }

  if (session.status !== "open") {
    throw new DiningSessionTransitionError(
      "Bill can only be requested for an open session"
    );
  }

  await transitionOpenToBillRequested(session, {
    source: "customer",
    tableNumber: session.tableNumber,
  });

  const updated = await findSessionById(session.id);
  if (!updated) {
    throw new DiningSessionNotFoundError();
  }

  return toPublicDiningSession(updated);
}

/** UX-1D — staff cancels bill request (bill_requested → open). */
export async function cancelBillRequest(input: StaffSessionActionInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);

  await applySessionTransition(session, "open", null, {}, { billRequestedAt: null });
}

/** UX-1D — staff marks payment in progress (bill_requested → payment_pending). */
export async function markPaymentPending(input: StaffSessionActionInput): Promise<void> {
  assertValidSessionActionInput(input);
  const session = await loadSessionForStaffAction(input.restaurantId, input.sessionId);
  const now = formatDiningSessionTimestamp();

  await applySessionTransition(
    session,
    "payment_pending",
    TABLE_EVENT_TYPES.PAYMENT_PENDING,
    {
      actorUserId: input.actorUserId,
      tableNumber: session.tableNumber,
    },
    { paymentPendingAt: now }
  );
}

/** UX-1D — staff closes session (open | bill_requested | payment_pending → closed). */
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
      orderCount: orderRows.length,
      ordersTotalAmount: computeOrdersTotalAmount(orderRows),
    },
    { closedAt: now, openGuard: null }
  );
}

/** Exported for unit tests. */
export function isAllowedSessionStatusTransition(
  from: DiningSessionStatus,
  to: DiningSessionStatus
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}
