/**
 * SALE-CUSTOMER-LINK-1 — attach/clear customerId on an existing Order (Sale).
 * Does not mutate Collection Fact, PAID, or financial totals.
 */

import { and, eq } from "drizzle-orm";
import { orders } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { resolveOptionalSaleCustomerId } from "../../customer/saleCustomerLink";

export async function setOrderSaleCustomerId(input: {
  restaurantId: number;
  orderId: number;
  customerId: number | null | undefined;
}): Promise<number | null> {
  const resolved = await resolveOptionalSaleCustomerId(
    input.restaurantId,
    input.customerId
  );
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(orders)
    .set({ customerId: resolved })
    .where(
      and(
        eq(orders.id, input.orderId),
        eq(orders.restaurantId, input.restaurantId)
      )
    );
  return resolved;
}
