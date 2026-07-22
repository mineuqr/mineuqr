/**
 * ORDER-SETTLEMENT-PERSISTENCE-1 — deterministic DB ↔ Domain mapping.
 * No lifecycle evaluation, money calculation, or invariant enforcement.
 */

import type { SelectCheckOrderSettlement } from "../../../drizzle/schema";
import {
  assertOrderSettlementStatus,
  type OrderSettlement,
  type OrderSettlementStatus,
} from "@shared/operational-session";

/** Persistence row view (includes surrogate id). */
export type OrderSettlementPersistenceRow = SelectCheckOrderSettlement;

/** Values for INSERT — explicit, no implicit Domain defaults beyond column SQL defaults. */
export type OrderSettlementInsertValues = Readonly<{
  restaurantId: number;
  checkId: number;
  orderId: number;
  status: OrderSettlementStatus;
  orderTotalSnapshot: string;
  allocatedAmount: string;
  settledAmount: string;
  outstandingAmount: string;
  createdAt: string;
  updatedAt: string;
}>;

/** Values for UPDATE — excludes identity keys. */
export type OrderSettlementUpdateValues = Readonly<{
  status: OrderSettlementStatus;
  orderTotalSnapshot: string;
  allocatedAmount: string;
  settledAmount: string;
  outstandingAmount: string;
  updatedAt: string;
}>;

function moneyString(value: string | number): string {
  return String(value);
}

export function mapRowToOrderSettlement(
  row: OrderSettlementPersistenceRow
): OrderSettlement {
  return {
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    orderId: row.orderId,
    status: assertOrderSettlementStatus(row.status),
    orderTotalSnapshot: moneyString(row.orderTotalSnapshot),
    allocatedAmount: moneyString(row.allocatedAmount),
    settledAmount: moneyString(row.settledAmount),
    outstandingAmount: moneyString(row.outstandingAmount),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toOrderSettlementInsertValues(
  settlement: OrderSettlement
): OrderSettlementInsertValues {
  return {
    restaurantId: settlement.restaurantId,
    checkId: settlement.checkId,
    orderId: settlement.orderId,
    status: settlement.status,
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    allocatedAmount: settlement.allocatedAmount,
    settledAmount: settlement.settledAmount,
    outstandingAmount: settlement.outstandingAmount,
    createdAt: settlement.createdAt,
    updatedAt: settlement.updatedAt,
  };
}

export function toOrderSettlementUpdateValues(
  settlement: OrderSettlement
): OrderSettlementUpdateValues {
  return {
    status: settlement.status,
    orderTotalSnapshot: settlement.orderTotalSnapshot,
    allocatedAmount: settlement.allocatedAmount,
    settledAmount: settlement.settledAmount,
    outstandingAmount: settlement.outstandingAmount,
    updatedAt: settlement.updatedAt,
  };
}
