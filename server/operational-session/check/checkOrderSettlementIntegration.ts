/**
 * ORDER-SETTLEMENT-INTEGRATION-1 — Check Aggregate orchestration for Order Settlement.
 *
 * Sole mutation path: Check Aggregate → Domain commands → Repository.
 * No Domain redesign. No schema changes. Events collected, not published.
 * ADR-ARCH-020 / 021 / 022.
 */

import { getOrderById } from "../../db";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import {
  applyComplimentary,
  applyFullSettlement,
  applyPartialSettlement,
  cancelOrderSettlement,
  createOrderSettlement,
  recalculateOrderSettlement,
  refundOrderSettlement,
  voidOrderSettlement,
  type OrderSettlement,
  type OrderSettlementCommandResult,
  type OrderSettlementDomainEvent,
  type OrderSettlementStatus,
} from "@shared/operational-session";
import {
  existsOrderSettlement,
  findOrderSettlementByIdentity,
  insertOrderSettlement,
  listOrderSettlementsForCheck,
  OrderSettlementPersistenceError,
  updateOrderSettlement,
} from "./orderSettlementRepository";

export type CheckOrderSettlementMutationResult = Readonly<{
  settlements: readonly OrderSettlement[];
  events: readonly OrderSettlementDomainEvent[];
  outcomes: readonly OrderSettlementCommandResult["outcome"][];
}>;

function moneySnapshot(value: unknown): string {
  if (value == null) return "0.00";
  return String(value);
}

async function persistCommandResult(
  previousStatus: OrderSettlementStatus,
  result: OrderSettlementCommandResult,
  client?: SessionDbClient
): Promise<void> {
  if (result.outcome === "already_in_state") {
    return;
  }
  await updateOrderSettlement(
    result.settlement,
    { expectedStatus: previousStatus },
    client
  );
}

/**
 * Ensure an Order Settlement exists after Membership enrollment (idempotent).
 */
export async function ensureOrderSettlementForEnrollment(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const existing = await findOrderSettlementByIdentity(input, client);
  if (existing) {
    return {
      settlements: [existing],
      events: [],
      outcomes: ["already_in_state"],
    };
  }

  const order = await getOrderById(input.orderId, client);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new Error(
      `Order ${input.orderId} not found for Order Settlement enrollment`
    );
  }

  const onCheck = await listOrderSettlementsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );

  const created = createOrderSettlement({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    orderId: input.orderId,
    orderTotalSnapshot: moneySnapshot(order.totalAmount),
    membershipExists: true,
    existingIdentities: onCheck.map((s) => ({
      restaurantId: s.restaurantId,
      checkId: s.checkId,
      orderId: s.orderId,
    })),
    checkRestaurantId: input.restaurantId,
    orderRestaurantId: order.restaurantId,
    at: formatDiningSessionTimestamp(),
  });

  try {
    await insertOrderSettlement(created.settlement, client);
  } catch (err) {
    if (
      err instanceof OrderSettlementPersistenceError &&
      err.code === "DUPLICATE"
    ) {
      const raced = await findOrderSettlementByIdentity(input, client);
      if (raced) {
        return {
          settlements: [raced],
          events: [],
          outcomes: ["already_in_state"],
        };
      }
    }
    throw err;
  }

  return {
    settlements: [created.settlement],
    events: created.events,
    outcomes: [created.outcome],
  };
}

/** Ensure OS rows for every active membership order on a Check. */
export async function ensureOrderSettlementsForCheck(
  input: { restaurantId: number; checkId: number; orderIds: readonly number[] },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const settlements: OrderSettlement[] = [];
  const events: OrderSettlementDomainEvent[] = [];
  const outcomes: OrderSettlementCommandResult["outcome"][] = [];

  for (const orderId of input.orderIds) {
    const result = await ensureOrderSettlementForEnrollment(
      {
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        orderId,
      },
      client
    );
    settlements.push(...result.settlements);
    events.push(...result.events);
    outcomes.push(...result.outcomes);
  }

  return { settlements, events, outcomes };
}

/** Recalculate all non-terminal OS amounts from current Order totals. */
export async function recalculateOrderSettlementsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const rows = await listOrderSettlementsForCheck(input, client);
  const settlements: OrderSettlement[] = [];
  const events: OrderSettlementDomainEvent[] = [];
  const outcomes: OrderSettlementCommandResult["outcome"][] = [];
  const at = formatDiningSessionTimestamp();

  for (const row of rows) {
    if (row.status !== "pending" && row.status !== "partially_settled") {
      settlements.push(row);
      continue;
    }
    const order = await getOrderById(row.orderId, client);
    if (!order || order.restaurantId !== input.restaurantId) {
      throw new Error(
        `Order ${row.orderId} missing during Order Settlement recalculate`
      );
    }
    const result = recalculateOrderSettlement({
      settlement: row,
      orderTotalSnapshot: moneySnapshot(order.totalAmount),
      at,
    });
    await persistCommandResult(row.status, result, client);
    settlements.push(result.settlement);
    events.push(...result.events);
    outcomes.push(result.outcome);
  }

  return { settlements, events, outcomes };
}

async function applyToAllOnCheck(
  input: { restaurantId: number; checkId: number },
  apply: (
    settlement: OrderSettlement,
    at: string
  ) => OrderSettlementCommandResult,
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const rows = await listOrderSettlementsForCheck(input, client);
  const settlements: OrderSettlement[] = [];
  const events: OrderSettlementDomainEvent[] = [];
  const outcomes: OrderSettlementCommandResult["outcome"][] = [];
  const at = formatDiningSessionTimestamp();

  for (const row of rows) {
    const result = apply(row, at);
    await persistCommandResult(row.status, result, client);
    settlements.push(result.settlement);
    events.push(...result.events);
    outcomes.push(result.outcome);
  }

  return { settlements, events, outcomes };
}

export async function applyFullSettlementToCheckOrders(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  return applyToAllOnCheck(
    input,
    (settlement, at) => applyFullSettlement({ settlement, at }),
    client
  );
}

export async function applyComplimentaryToCheckOrders(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  return applyToAllOnCheck(
    input,
    (settlement, at) => applyComplimentary({ settlement, at }),
    client
  );
}

export async function voidOrderSettlementsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  return applyToAllOnCheck(
    input,
    (settlement, at) => voidOrderSettlement({ settlement, at }),
    client
  );
}

export async function refundOrderSettlementsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  return applyToAllOnCheck(
    input,
    (settlement, at) => refundOrderSettlement({ settlement, at }),
    client
  );
}

export async function cancelOrderSettlementForOrder(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const row = await findOrderSettlementByIdentity(input, client);
  if (!row) {
    return { settlements: [], events: [], outcomes: [] };
  }
  const result = cancelOrderSettlement({
    settlement: row,
    at: formatDiningSessionTimestamp(),
  });
  await persistCommandResult(row.status, result, client);
  return {
    settlements: [result.settlement],
    events: result.events,
    outcomes: [result.outcome],
  };
}

export async function applyPartialSettlementForOrder(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
    coverageAmount: string;
  },
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const row = await findOrderSettlementByIdentity(input, client);
  if (!row) {
    throw new Error(
      `OrderSettlement not found for partial settle order=${input.orderId}`
    );
  }
  const result = applyPartialSettlement({
    settlement: row,
    coverageAmount: input.coverageAmount,
    at: formatDiningSessionTimestamp(),
  });
  await persistCommandResult(row.status, result, client);
  return {
    settlements: [result.settlement],
    events: result.events,
    outcomes: [result.outcome],
  };
}

export async function loadOrderSettlementsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<readonly OrderSettlement[]> {
  return listOrderSettlementsForCheck(input, client);
}

export async function orderSettlementExists(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
  },
  client?: SessionDbClient
): Promise<boolean> {
  return existsOrderSettlement(input, client);
}
