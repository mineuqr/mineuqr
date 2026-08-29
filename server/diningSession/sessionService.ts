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
import type { SessionDbClient } from "./sessionRepository";
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

/** Same-request restaurant/table already loaded by public ordering authorization. */
export type DiningTableContextPreload = {
  restaurant?: {
    id: number;
    isActive?: boolean | null;
    userId?: number;
    currencyCode?: string | null;
    currencySymbol?: string | null;
    taxEnabled?: boolean;
    taxMode?: string;
    taxPolicyJson?: string | null;
  } | null;
  table?: {
    id: number;
    restaurantId: number;
    tableNumber: number;
    isActive?: boolean | null;
  } | null;
};

type ValidatedDiningTableContext = {
  restaurant: NonNullable<DiningTableContextPreload["restaurant"]> & {
    id: number;
    isActive: boolean;
  };
  table: {
    id: number;
    restaurantId: number;
    tableNumber: number;
    isActive: boolean;
  };
};

function isReusableRestaurantPreload(
  restaurantId: number,
  restaurant: DiningTableContextPreload["restaurant"]
): restaurant is NonNullable<DiningTableContextPreload["restaurant"]> {
  return (
    restaurant != null &&
    restaurant.id === restaurantId &&
    restaurant.isActive != null
  );
}

function isReusableTablePreload(
  input: { restaurantId: number; tableId: number; tableNumber: number },
  table: DiningTableContextPreload["table"]
): table is NonNullable<DiningTableContextPreload["table"]> {
  return (
    table != null &&
    table.id === input.tableId &&
    table.restaurantId === input.restaurantId &&
    table.tableNumber === input.tableNumber &&
    table.isActive != null
  );
}

async function validateTableContext(
  input: {
    restaurantId: number;
    tableId: number;
    tableNumber: number;
  },
  preload?: DiningTableContextPreload | null
): Promise<ValidatedDiningTableContext> {
  const restaurant = isReusableRestaurantPreload(input.restaurantId, preload?.restaurant)
    ? preload.restaurant
    : await getRestaurantById(input.restaurantId);
  if (!restaurant) {
    throw new DiningSessionValidationError("Restaurant not found");
  }
  if (!restaurant.isActive) {
    throw new DiningSessionValidationError("Restaurant is not active");
  }

  const table = isReusableTablePreload(input, preload?.table)
    ? preload.table
    : await getTableById(input.tableId);
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

  return {
    restaurant: {
      ...restaurant,
      id: restaurant.id,
      isActive: true,
    },
    table: {
      id: table.id,
      restaurantId: table.restaurantId,
      tableNumber: table.tableNumber,
      isActive: true,
    },
  };
}

function isAllowedEventType(eventType: string): eventType is TableEventType {
  return (TABLE_EVENT_TYPE_VALUES as readonly string[]).includes(eventType);
}

type CreateSessionOptions = {
  tableContextAlreadyValidated?: boolean;
  restaurantRow?: ValidatedDiningTableContext["restaurant"] | null;
  preload?: DiningTableContextPreload | null;
};

/**
 * Internal — not exported. Opens session + SESSION_OPENED + open Check atomically.
 *
 * FIRST-ORDER-SESSION-CREATE-FAIL-CLOSED-HARDENING-1 — when `client` is a caller
 * transaction the opening rows join it instead of committing on their own, so a
 * first Order that fails after this point rolls the Session opening back and
 * leaves no orphan open Session and no empty Check.
 */
async function createSession(
  input: GetOrCreateSessionInput,
  options?: CreateSessionOptions,
  client?: SessionDbClient
): Promise<{
  session: SelectDiningSession;
  created: true;
}> {
  if (!options?.tableContextAlreadyValidated) {
    await validateTableContext(input, options?.preload);
  }

  const sessionToken = generateDiningSessionToken();
  const openedAt = formatDiningSessionTimestamp();

  const writeOpeningRows = async (tx: SessionDbClient) => {
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

    // CHECK-MANAGEMENT-ARCHITECTURE-1 — Open Check row + activeCheckId.
    // Empty membership/charge/OS work is deferred to first Order enroll.
    const check = await createOpenCheckForSession(
      {
        restaurantId: input.restaurantId,
        sessionId: id,
        skipEmptyBillPreparation: true,
        newSessionInSameTransaction: true,
        restaurantRow: options?.restaurantRow ?? null,
      },
      tx
    );

    return { sessionId: id, activeCheckId: check.id };
  };

  try {
    let opened: { sessionId: number; activeCheckId: number };
    if (client) {
      opened = await writeOpeningRows(client);
    } else {
      const db = await getDb();
      if (!db) {
        throw new DiningSessionUnavailableError();
      }
      opened = await db.transaction(async (tx) => writeOpeningRows(tx));
    }
    const { sessionId, activeCheckId } = opened;

    return {
      session: {
        id: sessionId,
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        tableNumber: input.tableNumber,
        sessionToken,
        status: "open",
        openGuard: DINING_SESSION_ACTIVE_OPEN_GUARD,
        openedAt,
        settledAt: null,
        settlementOutcome: null,
        closedAt: null,
        totalAmount: null,
        totalOrders: 0,
        activeCheckId,
        createdAt: openedAt,
        updatedAt: openedAt,
      },
      created: true,
    };
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

  const validated = await validateTableContext(input);

  const existing = await findActiveSession(input.restaurantId, input.tableId);
  if (existing) {
    if (existing.activeCheckId == null) {
      try {
        // Legacy session may already have Orders — keep full Check sync/money.
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
    const created = await createSession(input, {
      tableContextAlreadyValidated: true,
      restaurantRow: validated.restaurant,
    });
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
  tableContext?: DiningTableContextPreload;
};

/**
 * CUSTOMER-SESSION-LIFECYCLE-1F — authoritative session resolution for order.create.
 * Reuses active open sessions; rejects terminal hinted tokens; opens new sessions only when allowed.
 */
export async function resolveSessionForOrderCreate(
  input: ResolveSessionForOrderInput,
  client?: SessionDbClient
): Promise<GetOrCreateSessionResult> {
  if (!Number.isInteger(input.tableNumber) || input.tableNumber <= 0) {
    throw new DiningSessionValidationError("Invalid tableNumber");
  }

  const validated = await validateTableContext(input, input.tableContext);

  const active = await findActiveSession(input.restaurantId, input.tableId, client);
  if (active) {
    // CHECK-MANAGEMENT-ARCHITECTURE-1 — ensure legacy open sessions gain a Check.
    if (active.activeCheckId == null) {
      try {
        // Legacy session may already have Orders — keep full Check sync/money.
        await createOpenCheckForSession(
          {
            restaurantId: input.restaurantId,
            sessionId: active.id,
          },
          client
        );
      } catch {
        /* best-effort; settle path also ensures */
      }
      const refreshed = await findSessionById(active.id, client);
      if (refreshed) {
        return { session: refreshed, created: false };
      }
    }
    return { session: active, created: false };
  }

  if (input.sessionToken) {
    const hinted = await findSessionByToken(
      input.restaurantId,
      input.sessionToken,
      client
    );
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

  try {
    return await createSession(
      input,
      {
        tableContextAlreadyValidated: true,
        restaurantRow: validated.restaurant,
      },
      client
    );
  } catch (err) {
    if (
      err instanceof DiningSessionConflictError ||
      isMysqlDuplicateKeyError(err)
    ) {
      // A duplicate key inside a caller transaction leaves that transaction
      // unusable, so the winner must be re-read by the caller's retry.
      if (client) throw err;
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
