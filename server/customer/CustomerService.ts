/**
 * CUSTOMER-FOUNDATION-1
 * Server Customer service — Global Core. Not financial. Not Compliance.
 */

import { TRPCError } from "@trpc/server";
import {
  CUSTOMER_FOUNDATION_PROGRAM_ID,
  normalizeOptionalText,
  validateCustomerCreate,
  validateCustomerUpdate,
  type Customer,
  type CustomerCreateInput,
  type CustomerListFilter,
  type CustomerUpdateInput,
} from "@shared/customer";
import { emitAuditEvent } from "../audit/auditEmitter";
import { getRestaurantById } from "../db";
import {
  findCustomerById,
  insertCustomer,
  listCustomers,
  updateCustomerRow,
} from "./customerRepository";

async function assertRestaurantExists(restaurantId: number): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Restaurant not found" });
  }
}

export async function createCustomer(
  input: CustomerCreateInput,
  actor: { userId: number; role: string | null }
): Promise<Customer> {
  await assertRestaurantExists(input.restaurantId);
  const issues = validateCustomerCreate(input);
  if (issues.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: issues[0]?.message ?? "Invalid customer",
    });
  }
  const customer = await insertCustomer({
    restaurantId: input.restaurantId,
    displayName: input.displayName.trim(),
    customerType: input.customerType,
    phone: normalizeOptionalText(input.phone),
    email: normalizeOptionalText(input.email),
    address: normalizeOptionalText(input.address),
    taxNumber: normalizeOptionalText(input.taxNumber),
    status: "active",
  });
  emitAuditEvent({
    eventType: "customer.create",
    category: "COMMERCIAL",
    severity: "info",
    actorId: actor.userId,
    actorRole: actor.role,
    targetType: "restaurant",
    targetId: input.restaurantId,
    procedure: "customer.create",
    after: {
      customerId: customer.id,
      displayName: customer.displayName,
      customerType: customer.customerType,
      taxNumber: customer.taxNumber,
    },
    metadata: { program: CUSTOMER_FOUNDATION_PROGRAM_ID },
  });
  return customer;
}

export async function getCustomer(input: {
  restaurantId: number;
  id: number;
}): Promise<Customer> {
  await assertRestaurantExists(input.restaurantId);
  const customer = await findCustomerById(input.restaurantId, input.id);
  if (!customer) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
  }
  return customer;
}

export async function searchCustomers(
  filter: CustomerListFilter
): Promise<Customer[]> {
  await assertRestaurantExists(filter.restaurantId);
  return listCustomers(filter);
}

export async function updateCustomer(
  input: CustomerUpdateInput,
  actor: { userId: number; role: string | null }
): Promise<Customer> {
  await assertRestaurantExists(input.restaurantId);
  const issues = validateCustomerUpdate(input);
  if (issues.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: issues[0]?.message ?? "Invalid customer update",
    });
  }
  const before = await findCustomerById(input.restaurantId, input.id);
  if (!before) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
  }
  const patch: Parameters<typeof updateCustomerRow>[2] = {};
  if (input.displayName !== undefined) {
    patch.displayName = input.displayName.trim();
  }
  if (input.customerType !== undefined) {
    patch.customerType = input.customerType;
  }
  if (input.phone !== undefined) {
    patch.phone = normalizeOptionalText(input.phone);
  }
  if (input.email !== undefined) {
    patch.email = normalizeOptionalText(input.email);
  }
  if (input.address !== undefined) {
    patch.address = normalizeOptionalText(input.address);
  }
  if (input.taxNumber !== undefined) {
    patch.taxNumber = normalizeOptionalText(input.taxNumber);
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  const customer = await updateCustomerRow(
    input.restaurantId,
    input.id,
    patch
  );
  emitAuditEvent({
    eventType: "customer.update",
    category: "COMMERCIAL",
    severity: "info",
    actorId: actor.userId,
    actorRole: actor.role,
    targetType: "restaurant",
    targetId: input.restaurantId,
    procedure: "customer.update",
    before: {
      customerId: before.id,
      displayName: before.displayName,
      customerType: before.customerType,
      taxNumber: before.taxNumber,
      status: before.status,
    },
    after: {
      customerId: customer.id,
      displayName: customer.displayName,
      customerType: customer.customerType,
      taxNumber: customer.taxNumber,
      status: customer.status,
    },
    metadata: { program: CUSTOMER_FOUNDATION_PROGRAM_ID },
  });
  return customer;
}
