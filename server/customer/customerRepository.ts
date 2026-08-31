/**
 * CUSTOMER-FOUNDATION-1 — Customer persistence. Tenant-scoped.
 */

import { and, desc, eq, like, or, sql } from "drizzle-orm";
import {
  customers,
  type InsertCustomer,
  type SelectCustomer,
} from "../../drizzle/schema";
import { getDb } from "../db";
import type {
  Customer,
  CustomerListFilter,
  CustomerStatus,
  CustomerType,
} from "@shared/customer";

function mapRow(row: SelectCustomer): Customer {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    displayName: row.displayName,
    customerType: row.customerType as CustomerType,
    phone: row.phone ?? null,
    email: row.email ?? null,
    address: row.address ?? null,
    taxNumber: row.taxNumber ?? null,
    status: row.status as CustomerStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function insertCustomer(
  data: Omit<InsertCustomer, "id" | "createdAt" | "updatedAt">
): Promise<Customer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(customers).values(data);
  const id = result.insertId;
  const created = await findCustomerById(data.restaurantId, id);
  if (!created) throw new Error("Customer create failed");
  return created;
}

export async function findCustomerById(
  restaurantId: number,
  id: number
): Promise<Customer | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(customers)
    .where(
      and(eq(customers.id, id), eq(customers.restaurantId, restaurantId))
    )
    .limit(1);
  return row ? mapRow(row) : null;
}

export async function updateCustomerRow(
  restaurantId: number,
  id: number,
  patch: Partial<
    Pick<
      InsertCustomer,
      | "displayName"
      | "customerType"
      | "phone"
      | "email"
      | "address"
      | "taxNumber"
      | "status"
    >
  >
): Promise<Customer> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(customers)
    .set(patch)
    .where(
      and(eq(customers.id, id), eq(customers.restaurantId, restaurantId))
    );
  const updated = await findCustomerById(restaurantId, id);
  if (!updated) throw new Error("Customer update failed");
  return updated;
}

export async function listCustomers(
  filter: CustomerListFilter
): Promise<Customer[]> {
  const db = await getDb();
  if (!db) return [];
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const conditions = [eq(customers.restaurantId, filter.restaurantId)];
  if (filter.customerType) {
    conditions.push(eq(customers.customerType, filter.customerType));
  }
  if (filter.status) {
    conditions.push(eq(customers.status, filter.status));
  } else {
    conditions.push(eq(customers.status, "active"));
  }
  const q = filter.query?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(customers.displayName, pattern),
        like(customers.phone, pattern),
        like(customers.email, pattern)
      )!
    );
  }
  const rows = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.updatedAt))
    .limit(limit);
  return rows.map(mapRow);
}

export async function countCustomersForRestaurant(
  restaurantId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.restaurantId, restaurantId));
  return Number(row?.n ?? 0);
}
