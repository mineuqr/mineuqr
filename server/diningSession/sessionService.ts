/**
 * TABLE-MANAGEMENT-1 D2 — dining session service (no router / order integration).
 */
import { getRestaurantById, getTableById } from "../db";
import {
  findActiveSession,
  findSessionById,
  insertSession,
  insertSessionEvent,
} from "./sessionRepository";
import { generateDiningSessionToken } from "./sessionToken";
import {
  DiningSessionConflictError,
  DiningSessionNotFoundError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  TABLE_EVENT_TYPES,
  TABLE_EVENT_TYPE_VALUES,
  type GetActiveSessionInput,
  type GetOrCreateSessionInput,
  type GetOrCreateSessionResult,
  type RecordSessionEventInput,
  type RecordSessionEventResult,
  type TableEventType,
  formatDiningSessionTimestamp,
  isMysqlDuplicateKeyError,
} from "./sessionTypes";
import type { SelectDiningSession } from "../../drizzle/schema";
import { getDb } from "../db";

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
