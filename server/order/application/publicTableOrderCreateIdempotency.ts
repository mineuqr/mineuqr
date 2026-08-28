/**
 * ORDER-CREATE-SUBMISSION-IDEMPOTENCY-SCHEMA-AND-HARDENING-1
 * Public Table/QR order.create replay. Operational only — not Invoice/CF/PAID.
 */

import { TRPCError } from "@trpc/server";
import { ENV } from "../../_core/env";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import { getOrderById, getOrderItemsByOrderId } from "../../db";
import { findSessionById } from "../../diningSession/sessionRepository";
import { mapOrderDisplayIdentityFields } from "../read/presentation/mapOrderDisplayIdentity";
import type { SaveOrderOptions } from "../repositories/OrderRepository";
import {
  fingerprintOrderCreateSubmission,
  hashOrderCreateSubmissionIdForLog,
  type OrderCreateFingerprintInput,
} from "./orderCreateSubmissionFingerprint";
import {
  findOrderCreateIdempotency,
  insertOrderCreateIdempotencyInTransaction,
  isOrderCreateIdempotencyUniqueCollision,
  OrderCreateIdempotencyUniqueCollisionError,
} from "../infrastructure/persistence/orderCreateIdempotencyStore";

export class OrderCreateIdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT" as const;

  constructor() {
    super("Order create idempotency key was already used for a different request");
    this.name = "OrderCreateIdempotencyConflictError";
  }
}

export type PublicOrderCreateHttpResult = {
  orderId: number;
  orderNumber: string;
  trackingToken: string;
  displayReference: string;
  tableNumber: number;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  sessionToken?: string;
  sessionId?: number;
};

export function throwOrderCreateIdempotencyConflict(): never {
  throw new TRPCError({
    code: "CONFLICT",
    message: "Order create idempotency key was already used for a different request",
  });
}

export function logOrderCreateIdempotencyEvent(input: {
  type:
    | typeof OPS_EVENT.order_create_new
    | typeof OPS_EVENT.order_create_replayed
    | typeof OPS_EVENT.order_create_idempotency_conflict;
  restaurantId: number;
  submissionId: string;
  orderId?: number | null;
  correlationId?: string | null;
}): void {
  opsLog({
    type: input.type,
    category: "ORDER",
    severity: input.type === OPS_EVENT.order_create_idempotency_conflict ? "warn" : "info",
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    procedure: "order.create",
    metadata: {
      submissionHash: hashOrderCreateSubmissionIdForLog(input.submissionId),
      ...(input.orderId != null ? { orderId: input.orderId } : {}),
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    },
  });
}

export function computePublicOrderCreateFingerprint(
  input: OrderCreateFingerprintInput
): string {
  return fingerprintOrderCreateSubmission(input);
}

export function createPublicOrderCreateIdempotencyPersistHook(input: {
  restaurantId: number;
  submissionId: string;
  fingerprint: string;
}): NonNullable<SaveOrderOptions["afterPersistInTransaction"]> {
  return async (tx, result) => {
    const orderId = result.order.id;
    if (orderId == null) {
      throw new Error("Persisted order identity is required for create idempotency");
    }
    await insertOrderCreateIdempotencyInTransaction(tx, {
      restaurantId: input.restaurantId,
      submissionId: input.submissionId,
      fingerprint: input.fingerprint,
      orderId,
    });
  };
}

export async function replayPublicTableOrderCreate(input: {
  restaurantId: number;
  submissionId: string;
  fingerprint: string;
  tableId: number;
  tableNumber: number;
}): Promise<PublicOrderCreateHttpResult | null> {
  const mapping = await findOrderCreateIdempotency({
    restaurantId: input.restaurantId,
    submissionId: input.submissionId,
  });
  if (!mapping) return null;
  if (mapping.restaurantId !== input.restaurantId) {
    return null;
  }
  if (mapping.fingerprint !== input.fingerprint) {
    logOrderCreateIdempotencyEvent({
      type: OPS_EVENT.order_create_idempotency_conflict,
      restaurantId: input.restaurantId,
      submissionId: input.submissionId,
      orderId: mapping.orderId,
    });
    throwOrderCreateIdempotencyConflict();
  }

  const order = await getOrderById(mapping.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Idempotent order mapping is missing its Order",
    });
  }
  if (order.tableId !== input.tableId || order.tableNumber !== input.tableNumber) {
    logOrderCreateIdempotencyEvent({
      type: OPS_EVENT.order_create_idempotency_conflict,
      restaurantId: input.restaurantId,
      submissionId: input.submissionId,
      orderId: order.id,
    });
    throwOrderCreateIdempotencyConflict();
  }

  const items = await getOrderItemsByOrderId(order.id);
  if (!order.trackingToken) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Idempotent order mapping is missing trackingToken",
    });
  }
  const identity = mapOrderDisplayIdentityFields({
    orderNumber: order.orderNumber,
    businessDay: order.businessDay ?? null,
    dailyDisplayNumber: order.dailyDisplayNumber ?? null,
    identityScope: order.identityScope,
    fulfilmentAnchorType: order.fulfilmentAnchorType,
    serviceMode: order.serviceMode,
  });
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  let sessionToken: string | undefined;
  if (ENV.tableSessionDualWrite && order.sessionId != null) {
    const session = await findSessionById(order.sessionId);
    if (session && session.restaurantId === input.restaurantId) {
      sessionToken = session.sessionToken;
    }
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    trackingToken: order.trackingToken,
    displayReference: identity.displayReference,
    tableNumber: order.tableNumber,
    totalAmount: String(order.totalAmount),
    itemCount,
    createdAt: order.createdAt,
    status: order.status,
    ...(ENV.tableSessionDualWrite && sessionToken ? { sessionToken } : {}),
    ...(ENV.tableSessionDualWrite && order.sessionId != null
      ? { sessionId: order.sessionId }
      : {}),
  };
}

export async function replayAfterOrderCreateUniqueCollision(input: {
  restaurantId: number;
  submissionId: string;
  fingerprint: string;
  tableId: number;
  tableNumber: number;
  error: unknown;
}): Promise<PublicOrderCreateHttpResult> {
  if (
    input.error instanceof OrderCreateIdempotencyConflictError ||
    (input.error instanceof TRPCError && input.error.code === "CONFLICT")
  ) {
    throwOrderCreateIdempotencyConflict();
  }
  if (
    !(input.error instanceof OrderCreateIdempotencyUniqueCollisionError) &&
    !isOrderCreateIdempotencyUniqueCollision(input.error)
  ) {
    throw input.error;
  }
  const replayed = await replayPublicTableOrderCreate(input);
  if (!replayed) {
    throw input.error;
  }
  return replayed;
}

export {
  OrderCreateIdempotencyUniqueCollisionError,
  isOrderCreateIdempotencyUniqueCollision,
};
