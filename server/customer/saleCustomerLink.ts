/**
 * SALE-CUSTOMER-LINK-1
 * Resolve optional Sale.customerId with tenant isolation.
 * Does not classify invoices, tax, buyer category, or compliance.
 */

import { TRPCError } from "@trpc/server";
import { findCustomerById } from "./customerRepository";

/**
 * Validates optional customerId for attachment to a Sale in restaurantId.
 * null/undefined → null (valid anonymous Sale).
 * Cross-restaurant or missing → BAD_REQUEST / NOT_FOUND.
 */
export async function resolveOptionalSaleCustomerId(
  restaurantId: number,
  customerId: number | null | undefined
): Promise<number | null> {
  if (customerId == null) return null;
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid customerId",
    });
  }
  const customer = await findCustomerById(restaurantId, customerId);
  if (!customer) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Customer not found for this restaurant",
    });
  }
  return customer.id;
}
