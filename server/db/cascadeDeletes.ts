/**
 * Transactional cascade deletes (DELETE-ARCH-1B).
 * Children are always deleted before parents; one transaction per public entry point.
 */
import { eq, inArray } from "drizzle-orm";
import {
  authTokens,
  categories,
  invoices,
  menuItems,
  offers,
  orderItems,
  orders,
  printJobAttempts,
  printJobs,
  printers,
  renewalNotifications,
  restaurantHolidays,
  restaurantPrintSettings,
  restaurants,
  restaurantTables,
  userSubscriptions,
  users,
} from "../../drizzle/schema";
import { emitCascadeAuditEvent } from "../audit/auditEmitter";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { getDb } from "../db";
import { isPlatformAccountUserId } from "../platformAccount";
import type { SubscriptionAuditChangeFields } from "../subscriptionAuditSnapshot";

export class ProtectedUserDeleteError extends Error {
  readonly userId: number;

  constructor(userId: number) {
    super(`User ${userId} is protected and cannot be deleted`);
    this.name = "ProtectedUserDeleteError";
    this.userId = userId;
  }
}

export class ProtectedUserModifyError extends Error {
  readonly userId: number;
  readonly action: "role" | "password_reset" | "classification" | "subscription";

  constructor(
    userId: number,
    action: "role" | "password_reset" | "classification" | "subscription"
  ) {
    super(`User ${userId} is protected and cannot be modified (${action})`);
    this.name = "ProtectedUserModifyError";
    this.userId = userId;
    this.action = action;
  }
}

export type CascadeAuditContext = {
  actorId?: number | null;
  role?: string | null;
  correlationId?: string;
  procedure?: string;
  action?: string;
  ip?: string;
  /** Subscription Snapshot Format v1 subset — admin delete audit (PR-4). */
  subscriptionBefore?: SubscriptionAuditChangeFields;
};

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<DbHandle["transaction"]>[0]>[0];

function assertDbAvailable(db: DbHandle | null): asserts db is DbHandle {
  if (!db) throw new Error("Database not available");
}

export async function assertUserDeletable(userId: number): Promise<void> {
  if (await isPlatformAccountUserId(userId)) {
    throw new ProtectedUserDeleteError(userId);
  }
}

export async function assertProtectedUserRoleModifiable(userId: number): Promise<void> {
  if (await isPlatformAccountUserId(userId)) {
    throw new ProtectedUserModifyError(userId, "role");
  }
}

export async function assertProtectedUserPasswordResetAllowed(userId: number): Promise<void> {
  if (await isPlatformAccountUserId(userId)) {
    throw new ProtectedUserModifyError(userId, "password_reset");
  }
}

export async function assertProtectedUserClassificationModifiable(
  userId: number
): Promise<void> {
  if (await isPlatformAccountUserId(userId)) {
    throw new ProtectedUserModifyError(userId, "classification");
  }
}

export async function assertProtectedUserSubscriptionModifiable(
  userId: number
): Promise<void> {
  if (await isPlatformAccountUserId(userId)) {
    throw new ProtectedUserModifyError(userId, "subscription");
  }
}

function logCascade(
  type: string,
  audit: CascadeAuditContext | undefined,
  metadata: Record<string, unknown>
): void {
  emitCascadeAuditEvent(type, audit, metadata);
}

async function deleteSubscriptionCascadeTx(
  tx: Tx,
  subscriptionId: number
): Promise<void> {
  await tx.delete(invoices).where(eq(invoices.subscriptionId, subscriptionId));
  await tx
    .delete(renewalNotifications)
    .where(eq(renewalNotifications.subscriptionId, subscriptionId));
  await tx
    .delete(userSubscriptions)
    .where(eq(userSubscriptions.id, subscriptionId));
}

export async function deleteSubscriptionCascade(
  subscriptionId: number,
  audit?: CascadeAuditContext
): Promise<void> {
  const db = await getDb();
  assertDbAvailable(db);

  logCascade(OPS_EVENT.cascade_subscription_deleted, audit, {
    phase: "start",
    subscriptionId,
  });

  await db.transaction(async (tx) => {
    await deleteSubscriptionCascadeTx(tx, subscriptionId);
  });

  logCascade(OPS_EVENT.cascade_subscription_deleted, audit, {
    phase: "completed",
    subscriptionId,
    ...(audit?.subscriptionBefore ? { before: audit.subscriptionBefore } : {}),
  });
}

async function subscriptionIdsForRestaurant(
  tx: Tx,
  restaurantId: number
): Promise<number[]> {
  const rows = await tx
    .select({ id: userSubscriptions.id })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.restaurantId, restaurantId));
  return rows.map((r) => r.id);
}

export async function deleteRestaurantCascadeTx(
  tx: Tx,
  restaurantId: number
): Promise<void> {
  const printJobRows = await tx
    .select({ id: printJobs.id })
    .from(printJobs)
    .where(eq(printJobs.restaurantId, restaurantId));
  const printJobIds = printJobRows.map((r) => r.id);

  if (printJobIds.length > 0) {
    await tx
      .delete(printJobAttempts)
      .where(inArray(printJobAttempts.printJobId, printJobIds));
  }

  await tx.delete(printJobs).where(eq(printJobs.restaurantId, restaurantId));
  await tx
    .delete(restaurantPrintSettings)
    .where(eq(restaurantPrintSettings.restaurantId, restaurantId));
  await tx.delete(printers).where(eq(printers.restaurantId, restaurantId));

  const orderRows = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.restaurantId, restaurantId));
  const orderIds = orderRows.map((r) => r.id);

  if (orderIds.length > 0) {
    await tx
      .delete(orderItems)
      .where(inArray(orderItems.orderId, orderIds));
  }

  await tx.delete(orders).where(eq(orders.restaurantId, restaurantId));
  await tx
    .delete(restaurantTables)
    .where(eq(restaurantTables.restaurantId, restaurantId));
  await tx
    .delete(restaurantHolidays)
    .where(eq(restaurantHolidays.restaurantId, restaurantId));
  await tx.delete(offers).where(eq(offers.restaurantId, restaurantId));
  await tx.delete(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  await tx.delete(categories).where(eq(categories.restaurantId, restaurantId));

  const subIds = await subscriptionIdsForRestaurant(tx, restaurantId);
  if (subIds.length > 0) {
    await tx
      .delete(invoices)
      .where(inArray(invoices.subscriptionId, subIds));
    await tx
      .delete(renewalNotifications)
      .where(inArray(renewalNotifications.subscriptionId, subIds));
    await tx
      .delete(userSubscriptions)
      .where(inArray(userSubscriptions.id, subIds));
  }

  await tx.delete(restaurants).where(eq(restaurants.id, restaurantId));
}

export async function deleteRestaurantCascade(
  restaurantId: number,
  audit?: CascadeAuditContext
): Promise<void> {
  const db = await getDb();
  assertDbAvailable(db);

  logCascade(OPS_EVENT.cascade_restaurant_deleted, audit, {
    phase: "start",
    restaurantId,
  });

  await db.transaction(async (tx) => {
    await deleteRestaurantCascadeTx(tx, restaurantId);
  });

  logCascade(OPS_EVENT.cascade_restaurant_deleted, audit, {
    phase: "completed",
    restaurantId,
  });
}

export async function deleteUserCascadeTx(
  tx: Tx,
  userId: number
): Promise<void> {
  const ownedRestaurants = await tx
    .select({ id: restaurants.id })
    .from(restaurants)
    .where(eq(restaurants.userId, userId));

  for (const { id: restaurantId } of ownedRestaurants) {
    await deleteRestaurantCascadeTx(tx, restaurantId);
  }

  await tx.delete(invoices).where(eq(invoices.userId, userId));
  await tx
    .delete(renewalNotifications)
    .where(eq(renewalNotifications.userId, userId));
  await tx
    .delete(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));
  await tx.delete(authTokens).where(eq(authTokens.userId, userId));
  await tx.delete(users).where(eq(users.id, userId));
}

export async function deleteUserCascade(
  userId: number,
  audit?: CascadeAuditContext
): Promise<void> {
  await assertUserDeletable(userId);

  const db = await getDb();
  assertDbAvailable(db);

  logCascade(OPS_EVENT.cascade_user_deleted, audit, {
    phase: "start",
    targetUserId: userId,
  });

  await db.transaction(async (tx) => {
    await deleteUserCascadeTx(tx, userId);
  });

  logCascade(OPS_EVENT.cascade_user_deleted, audit, {
    phase: "completed",
    targetUserId: userId,
  });
}
