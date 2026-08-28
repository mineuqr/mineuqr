/**
 * ORDER-CREATE-SUBMISSION-IDEMPOTENCY-SCHEMA-AND-HARDENING-1
 * Durable (restaurantId, submissionId) → orderId map.
 * Database PRIMARY KEY is the multi-instance authority. Not in-memory.
 */

import { and, eq } from "drizzle-orm";
import { orderCreateIdempotency } from "../../../../drizzle/schema";
import { getDb } from "../../../db";
import { classifyBusinessIdentityInfrastructureError } from "../../business-identity/infrastructure/mysqlInfrastructureErrors";

export type OrderCreateIdempotencyRecord = {
  restaurantId: number;
  submissionId: string;
  fingerprint: string;
  orderId: number;
};

export class OrderCreateIdempotencyUniqueCollisionError extends Error {
  constructor() {
    super("order_create_idempotency_unique_collision");
    this.name = "OrderCreateIdempotencyUniqueCollisionError";
  }
}

export function isOrderCreateIdempotencyUniqueCollision(
  error: unknown
): boolean {
  return error instanceof OrderCreateIdempotencyUniqueCollisionError;
}

type OrderCreateTx = {
  insert: (table: typeof orderCreateIdempotency) => {
    values: (row: {
      restaurantId: number;
      submissionId: string;
      fingerprint: string;
      orderId: number;
    }) => Promise<unknown>;
  };
};

export async function findOrderCreateIdempotency(input: {
  restaurantId: number;
  submissionId: string;
}): Promise<OrderCreateIdempotencyRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select({
      restaurantId: orderCreateIdempotency.restaurantId,
      submissionId: orderCreateIdempotency.submissionId,
      fingerprint: orderCreateIdempotency.fingerprint,
      orderId: orderCreateIdempotency.orderId,
    })
    .from(orderCreateIdempotency)
    .where(
      and(
        eq(orderCreateIdempotency.restaurantId, input.restaurantId),
        eq(orderCreateIdempotency.submissionId, input.submissionId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function insertOrderCreateIdempotencyInTransaction(
  tx: unknown,
  record: OrderCreateIdempotencyRecord
): Promise<void> {
  const dbTx = tx as OrderCreateTx | null;
  if (!dbTx) {
    throw new Error("database_unavailable");
  }
  try {
    await dbTx.insert(orderCreateIdempotency).values({
      restaurantId: record.restaurantId,
      submissionId: record.submissionId,
      fingerprint: record.fingerprint,
      orderId: record.orderId,
    });
  } catch (error) {
    if (classifyBusinessIdentityInfrastructureError(error) === "unique_violation") {
      throw new OrderCreateIdempotencyUniqueCollisionError();
    }
    throw error;
  }
}
