import { eq, and, asc, desc, sql, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import {
  InsertUser, users,
  authTokens, InsertAuthToken,
  restaurants, InsertRestaurant,
  categories, InsertCategory,
  menuItems, InsertMenuItem,
  subscriptionPlans, InsertSubscriptionPlan,
  userSubscriptions, InsertUserSubscription,
  offers, InsertOffer,
  invoices, InsertInvoice, SelectInvoice,
  renewalNotifications, InsertRenewalNotification,
  countriesCurrencies,
  restaurantHolidays, InsertRestaurantHoliday,
  restaurantTables, InsertRestaurantTable,
  orders, InsertOrder,
  orderItems, InsertOrderItem,
  customerPushSubscriptions, InsertCustomerPushSubscription,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { readMysqlAffectedRows } from "./db/mysqlAffectedRows";
import { isPlatformAccountOpenId, isPlatformAccountUser } from "./platformAccount";
import {
  DEFAULT_ACCOUNT_CLASSIFICATION,
  type AccountClassification,
} from "@shared/accountClassification";
import {
  normalizeAccountEmail,
  normalizeAccountEmailOrNull,
} from "./_core/normalizeAccountEmail";
import {
  parseStoredUtcInstant,
  isInBusinessYearMonth,
  businessYearMonthMonthsAgo,
  formatBusinessYearMonthLabel,
} from "@shared/utils/timezone";
import { pickCanonicalSubscription } from "./subscriptionResolver";
import { userHasSubscriptionEntitlement } from "./subscriptionEntitlement";
import {
  resolveSubscriptionForActivationFromRows,
  type ActivationTargetOptions,
} from "./subscriptionActivation";
import {
  computeChurnRate,
  computeRenewalRate,
} from "./adminKpiCalculations";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: Pool | null = null;

/** Parse DATABASE_URL; mirrors scripts/apply-session-valid-after-local-patch.cjs ssl handling. */
function parseDatabaseUrl(databaseUrl: string): PoolOptions {
  const url = new URL(databaseUrl);
  const sslRaw = url.searchParams.get("ssl");
  let ssl: PoolOptions["ssl"];
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw) as PoolOptions["ssl"];
    } catch {
      ssl = sslRaw as PoolOptions["ssl"];
    }
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl,
  };
}

/** TiDB Serverless requires TLS; mysql2 defaults to ssl:false when the URL omits ?ssl=... */
function createRuntimeMysqlPool(databaseUrl: string): Pool {
  const cfg = parseDatabaseUrl(databaseUrl);
  const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host ?? "");
  const ssl =
    cfg.ssl ??
    (isTidbCloud
      ? { minVersion: "TLSv1.2" as const, rejectUnauthorized: true }
      : undefined);
  console.log("[TLS DEBUG]", {
    host: cfg.host,
    port: cfg.port,
    isTidbCloud,
    cfgSsl: cfg.ssl,
    finalSsl: ssl,
  });
  return createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(ssl ? { ssl } : {}),
  });
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = createRuntimeMysqlPool(process.env.DATABASE_URL);
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

/** Idempotent CLI/server shutdown — releases mysql2 pool handles. */
export async function closeDb(): Promise<void> {
  if (!_pool) {
    return;
  }
  const pool = _pool;
  _pool = null;
  _db = null;
  await pool.end();
}

// ─── User helpers ───────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      let normalized = value ?? null;
      if (field === "email" && typeof normalized === "string") {
        normalized = normalizeAccountEmailOrNull(normalized);
      }
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.accountClassification !== undefined) {
      values.accountClassification = user.accountClassification;
      updateSet.accountClassification = user.accountClassification;
    } else if (user.openId !== undefined) {
      values.accountClassification = DEFAULT_ACCOUNT_CLASSIFICATION;
    }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (isPlatformAccountOpenId(user.openId)) {
      values.role = 'admin';
      updateSet.role = 'admin';
      values.accountClassification = 'INTERNAL';
      updateSet.accountClassification = 'INTERNAL';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date().toISOString();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date().toISOString();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(openId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot update password: database not available"); return; }
  await db.update(users).set({ passwordHash, passwordChangedAt: new Date().toISOString() }).where(eq(users.openId, openId));
}

/**
 * Stateless session revocation boundary (AUTH2-C Slice 3B.3).
 * Any session issued (iat) before this timestamp should be treated as invalid.
 */
export async function updateUserSessionValidAfter(
  openId: string,
  sessionValidAfterIso: string = new Date().toISOString()
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot update sessionValidAfter: database not available"
    );
    return;
  }
  await db
    .update(users)
    .set({ sessionValidAfter: sessionValidAfterIso })
    .where(eq(users.openId, openId));
}

export async function markUserEmailVerified(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerifiedAt: new Date().toISOString() }).where(eq(users.id, userId));
}

// ─── Auth token helpers (AUTH2-B) ───────────────────────────────────────────────

export async function createAuthToken(input: {
  userId: number;
  type: InsertAuthToken["type"];
  tokenHash: string;
  expiresAt: string;
}): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(authTokens).values({
    userId: input.userId,
    type: input.type,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
  });
  return { id: result[0].insertId };
}

export async function getAuthTokenByHash(tokenHash: string, type: InsertAuthToken["type"]) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.tokenHash, tokenHash), eq(authTokens.type, type)))
    .limit(1);
  return row ?? null;
}

export async function markAuthTokenUsed(tokenId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(authTokens).set({ usedAt: new Date().toISOString() }).where(eq(authTokens.id, tokenId));
}

export async function invalidateUnusedEmailVerificationTokens(
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authTokens)
    .set({ usedAt: new Date().toISOString() })
    .where(
      and(
        eq(authTokens.userId, userId),
        eq(authTokens.type, "email_verify"),
        isNull(authTokens.usedAt)
      )
    );
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const normalized = normalizeAccountEmail(email);
  const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; email?: string; clearEmailVerification?: boolean }
) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot update user: database not available"); return; }
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.email !== undefined) {
    updateSet.email = normalizeAccountEmailOrNull(data.email);
  }
  if (data.clearEmailVerification) {
    updateSet.emailVerifiedAt = null;
  }
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, userId));
}

// ─── Restaurant helpers ─────────────────────────────────────

export async function getRestaurantsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurants).where(eq(restaurants.userId, userId)).orderBy(asc(restaurants.createdAt));
}

export async function getRestaurantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1);
  return result[0];
}

export async function getRestaurantBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);
  return result[0];
}

export async function createRestaurant(data: InsertRestaurant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(restaurants).values(data);
  return { id: result[0].insertId };
}

export async function updateRestaurant(id: number, data: Partial<InsertRestaurant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(restaurants).set(data).where(eq(restaurants.id, id));
}

export async function incrementViewCount(restaurantId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(restaurants).set({ viewCount: sql`${restaurants.viewCount} + 1` }).where(eq(restaurants.id, restaurantId));
}

// ─── Category helpers ───────────────────────────────────────

export async function getCategoriesByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.restaurantId, restaurantId)).orderBy(asc(categories.sortOrder));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return result[0];
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(categories).values(data);
  return { id: result[0].insertId };
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(menuItems).where(eq(menuItems.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── MenuItem helpers ───────────────────────────────────────

export async function getMenuItemsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(asc(menuItems.sortOrder));
}

export async function getMenuItemsByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId)).orderBy(asc(menuItems.sortOrder));
}

export async function getMenuItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(menuItems).where(eq(menuItems.id, id)).limit(1);
  return result[0];
}

export async function createMenuItem(data: InsertMenuItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(menuItems).values(data);
  return { id: result[0].insertId };
}

export async function updateMenuItem(id: number, data: Partial<InsertMenuItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

export async function deleteMenuItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(menuItems).where(eq(menuItems.id, id));
}

// ─── Stats helpers ──────────────────────────────────────────

export async function getRestaurantStats(restaurantId: number) {
  const db = await getDb();
  if (!db) return { totalCategories: 0, totalItems: 0, viewCount: 0 };
  const [catCount] = await db.select({ count: sql<number>`count(*)` }).from(categories).where(eq(categories.restaurantId, restaurantId));
  const [itemCount] = await db.select({ count: sql<number>`count(*)` }).from(menuItems).where(eq(menuItems.restaurantId, restaurantId));
  const restaurant = await getRestaurantById(restaurantId);
  return {
    totalCategories: catCount?.count ?? 0,
    totalItems: itemCount?.count ?? 0,
    viewCount: restaurant?.viewCount ?? 0,
  };
}


// ─── Subscription Plan helpers (ORM residual — not commercial authority) ──

export async function getSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(asc(subscriptionPlans.sortOrder));
}

export async function getSubscriptionPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return result[0];
}

export async function createSubscriptionPlan(data: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subscriptionPlans).values(data);
  return { id: result[0].insertId };
}

// ─── User Subscription helpers ──────────────────────────────

/** All subscription rows for a user (newest id first). Prefer getSubscriptionForRestaurant for restaurant scope. */
export async function getSubscriptionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .orderBy(desc(userSubscriptions.id));
}

/**
 * Canonical restaurant-scoped subscription row.
 * Prefers entitled trial/active, then inactive trial/active, then canceled/expired;
 * breaks ties by latest period end, then highest id. Safe when duplicates exist.
 */
export async function getSubscriptionForRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.restaurantId, restaurantId));
  return pickCanonicalSubscription(rows);
}

/**
 * Canonical account-level subscription row (best entitled trial/active, deterministic ties).
 * Prefer over getUserSubscription() for multi-location accounts.
 */
export async function getCanonicalUserSubscription(userId: number) {
  const rows = await getSubscriptionsByUser(userId);
  return pickCanonicalSubscription(rows);
}

/**
 * @deprecated Legacy user-scoped lookup — uses unordered limit(1). Unsafe when a user owns
 * multiple restaurants. Prefer getCanonicalUserSubscription or getSubscriptionsByUser.
 */
export async function getUserSubscription(userId: number) {
  return getCanonicalUserSubscription(userId);
}

export async function createUserSubscription(data: InsertUserSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userSubscriptions).values(data);
  return { id: result[0].insertId };
}

/**
 * @deprecated Prefer updateSubscriptionById or updateSubscriptionForActivation.
 * Updates exactly one row (canonical target), not all rows for userId (C1 fixed in LH-1B-4).
 */
export async function updateUserSubscription(
  userId: number,
  data: Partial<InsertUserSubscription>,
  options?: ActivationTargetOptions
) {
  const updatedId = await updateSubscriptionForActivation(userId, data, options);
  if (updatedId == null) throw new Error("No subscription row found for user");
}

export async function getSubscriptionById(subscriptionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.id, subscriptionId))
    .limit(1);
  return result[0];
}

export async function resolveSubscriptionForActivation(
  userId: number,
  options: ActivationTargetOptions = {}
) {
  const rows = await getSubscriptionsByUser(userId);
  return resolveSubscriptionForActivationFromRows(rows, options);
}

/** Update a single subscription row for payment/activation (never all rows for userId). */
export async function updateSubscriptionForActivation(
  userId: number,
  data: Partial<InsertUserSubscription>,
  options: ActivationTargetOptions = {}
): Promise<number | null> {
  const target = await resolveSubscriptionForActivation(userId, options);
  if (!target) return null;
  await updateSubscriptionById(target.id, data);
  return target.id;
}

/** Account-level entitlement: any period-valid trial/active row for the user. */
export async function isSubscriptionActive(userId: number): Promise<boolean> {
  const rows = await getSubscriptionsByUser(userId);
  return userHasSubscriptionEntitlement(rows);
}

export async function getTrialEndDate(userId: number): Promise<Date | null> {
  const rows = await getSubscriptionsByUser(userId);
  const trial = pickCanonicalSubscription(rows.filter((r) => r.status === "trial"));
  return trial ? parseStoredUtcInstant(trial.trialEndsAt) : null;
}

// ─── Offer helpers ─────────────────────────────────────────

export async function getOffersByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offers).where(eq(offers.restaurantId, restaurantId)).orderBy(asc(offers.createdAt));
}

export async function getActiveOffersByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(offers).where(
    and(
      eq(offers.restaurantId, restaurantId),
      eq(offers.isActive, true),
      sql`${offers.startDate} <= ${now}`,
      sql`${offers.endDate} >= ${now}`
    )
  ).orderBy(asc(offers.endDate));
}

export async function getOfferById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  return result[0];
}

export async function createOffer(data: InsertOffer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(offers).values(data);
  return { id: result[0].insertId };
}

export async function updateOffer(id: number, data: Partial<InsertOffer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(offers).set(data).where(eq(offers.id, id));
}

export async function deleteOffer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(offers).where(eq(offers.id, id));
}


// ─── Invoice helpers ────────────────────────────────────────

export async function getInvoicesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(sql`${invoices.issuedAt} DESC`);
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data);
  return { id: result[0].insertId };
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function getUnpaidInvoices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(
    and(
      eq(invoices.userId, userId),
      sql`${invoices.status} IN ('pending', 'failed')`
    )
  ).orderBy(sql`${invoices.dueAt} ASC`);
}

// ─── Renewal Notification helpers ───────────────────────────

export async function getNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(renewalNotifications).where(eq(renewalNotifications.userId, userId)).orderBy(sql`${renewalNotifications.createdAt} DESC`);
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(renewalNotifications).where(
    and(
      eq(renewalNotifications.userId, userId),
      eq(renewalNotifications.isRead, false)
    )
  ).orderBy(sql`${renewalNotifications.createdAt} DESC`);
}

export async function createNotification(data: InsertRenewalNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(renewalNotifications).values(data);
  return { id: result[0].insertId };
}

export async function updateNotification(id: number, data: Partial<InsertRenewalNotification>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(renewalNotifications).set(data).where(eq(renewalNotifications.id, id));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(renewalNotifications).set({ isRead: true }).where(eq(renewalNotifications.id, id));
}

export async function getUnsentNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(renewalNotifications).where(eq(renewalNotifications.isSent, false));
}

export async function markNotificationAsSent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(renewalNotifications).set({ isSent: true, sentAt: new Date().toISOString() }).where(eq(renewalNotifications.id, id));
}


// ─── Countries & Currencies helpers ──────────────────────────

export async function getCurrencyByCountryCode(countryCode: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get currency: database not available"); return null; }
  try {
    const result = await db.select().from(countriesCurrencies).where(eq(countriesCurrencies.countryCode, countryCode.toUpperCase()));
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get currency:", error);
    return null;
  }
}

export async function getAllCountriesCurrencies() {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get countries: database not available"); return []; }
  try {
    const result = await db.select().from(countriesCurrencies).where(eq(countriesCurrencies.isActive, true));
    return result || [];
  } catch (error) {
    console.error("[Database] Failed to get countries:", error);
    return [];
  }
}

// ─── Admin Subscription helpers ─────────────────────────────

export async function getAllSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userSubscriptions);
}

export async function createSubscriptionForRestaurant(data: InsertUserSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userSubscriptions).values(data);
  return { id: result[0].insertId };
}

export async function updateSubscriptionById(id: number, data: Partial<InsertUserSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userSubscriptions).set(data).where(eq(userSubscriptions.id, id));
}

export async function cancelSubscriptionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userSubscriptions).set({
    status: "canceled",
    canceledAt: new Date().toISOString(),
  }).where(eq(userSubscriptions.id, id));
}

// Admin Statistics Functions
/** @deprecated EXEC-6 — S6 legacy metrics. Statistics.tsx dual-read only; use analytics.* + getSubscriptionOverview. */
export async function getAdminStatistics() {
  const db = await getDb();
  if (!db) return null;

  const allSubs = await db.select().from(userSubscriptions);

  const activeSubscriptions = allSubs.filter(s => s.status === 'active' || s.status === 'trial');
  const trialSubscriptions = allSubs.filter(s => s.status === 'trial');
  const expiredSubscriptions = allSubs.filter(s => s.status === 'expired');
  const canceledSubscriptions = allSubs.filter(s => s.status === 'canceled');

  const renewalRate = computeRenewalRate(allSubs.length, activeSubscriptions.length);
  const churnRate = computeChurnRate(
    allSubs.length,
    canceledSubscriptions.length,
    expiredSubscriptions.length
  );

  const { bridgeByLegacyPlanId } = await import(
    "./services/commercial-catalog/legacyPlanBridge"
  );
  const byPlan = new Map<number, number>();
  for (const sub of activeSubscriptions) {
    byPlan.set(sub.planId, (byPlan.get(sub.planId) ?? 0) + 1);
  }

  return {
    totalSubscribers: allSubs.length,
    activeSubscribers: activeSubscriptions.length,
    trialSubscribers: trialSubscriptions.length,
    expiredSubscribers: expiredSubscriptions.length,
    canceledSubscribers: canceledSubscriptions.length,
    totalRevenue: 0,
    renewalRate,
    churnRate,
    subscriptionsByPlan: [...byPlan.entries()].map(([planId, count]) => ({
      planId,
      planName: bridgeByLegacyPlanId(planId)?.catalogPlanName ?? `plan:${planId}`,
      count,
    })),
  };
}

/**
 * @deprecated REPORTING-CANONICAL-API-SUNSET-1 + EXEC-6 — Legacy admin revenue buckets.
 * Soft-sunset: no production client consumers.
 * Not restaurant Check Revenue SSOT. Gap: ADMIN-REPORTING-PLATFORM-ADOPTION.
 */
export async function getRevenueByMonth(months: number = 12) {
  const db = await getDb();
  if (!db) return [];

  const revenueData: { month: string; revenue: number }[] = [];

  // Soft-sunset. Not Check Revenue. Not canonical MRR. Does not read the legacy plan table.
  for (let i = months - 1; i >= 0; i--) {
    const bucket = businessYearMonthMonthsAgo(i);
    const monthStr = formatBusinessYearMonthLabel(bucket.year, bucket.month);

    revenueData.push({
      month: monthStr,
      revenue: 0,
    });
  }

  return revenueData;
}

// ─── Public Statistics (for About page) ───────────────────────
export async function getPublicStats() {
  const db = await getDb();
  if (!db) return { totalRestaurants: 0, totalUsers: 0, totalMenuItems: 0, totalCategories: 0 };

  const allRestaurants = await db.select().from(restaurants);
  const allUsers = await db.select().from(users);
  const allMenuItems = await db.select().from(menuItems);
  const allCategories = await db.select().from(categories);

  return {
    totalRestaurants: allRestaurants.length,
    totalUsers: allUsers.length,
    totalMenuItems: allMenuItems.length,
    totalCategories: allCategories.length,
  };
}

// ─── Extended Admin Statistics ───────────────────────
export async function getExtendedAdminStats() {
  const db = await getDb();
  if (!db) return null;

  const allRestaurants = await db.select().from(restaurants);
  const allUsers = await db.select().from(users);
  const allMenuItems = await db.select().from(menuItems);
  const allCategories = await db.select().from(categories);
  const allSubs = await db.select().from(userSubscriptions);
  const allOffers = await db.select().from(offers);

  // Users registered per month (last 12 months) in APP_TIMEZONE business calendar.
  // Bucket semantics aligned with Dashboard TZ-5a; DB DATETIME assumed UTC.
  const userGrowth: { month: string; users: number; restaurants: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const bucket = businessYearMonthMonthsAgo(i);
    const monthStr = formatBusinessYearMonthLabel(bucket.year, bucket.month);

    const usersInMonth = allUsers.filter((u) =>
      isInBusinessYearMonth(u.createdAt, bucket.year, bucket.month)
    ).length;

    const restaurantsInMonth = allRestaurants.filter((r) =>
      isInBusinessYearMonth(r.createdAt, bucket.year, bucket.month)
    ).length;

    userGrowth.push({ month: monthStr, users: usersInMonth, restaurants: restaurantsInMonth });
  }

  return {
    totalRestaurants: allRestaurants.length,
    totalUsers: allUsers.length,
    totalMenuItems: allMenuItems.length,
    totalCategories: allCategories.length,
    totalOffers: allOffers.length,
    totalSubscriptions: allSubs.length,
    userGrowth,
  };
}


// ─── Users Management ───────────────────────

/** Strip credential material before admin list API responses (ADMIN-AUDIT-FIX-2). */
export function sanitizeUserForAdminResponse<
  U extends { passwordHash?: string | null; openId?: string },
>(
  user: U
): Omit<U, "passwordHash"> & { isProtectedPlatformAccount: boolean } {
  const { passwordHash: _removed, ...safe } = user;
  return {
    ...safe,
    isProtectedPlatformAccount: isPlatformAccountUser(
      user.openId != null ? { openId: user.openId } : null
    ),
  };
}

export type GetAllUsersOptions = {
  classificationFilter?: AccountClassification;
};

export async function getAllUsers(options?: GetAllUsersOptions) {
  const db = await getDb();
  if (!db) return [];

  if (options?.classificationFilter) {
    return await db
      .select()
      .from(users)
      .where(eq(users.accountClassification, options.classificationFilter));
  }

  return await db.select().from(users);
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] || null;
}

export async function updateUserRole(userId: number, role: 'admin' | 'user') {
  const db = await getDb();
  if (!db) return null;

  const result = await db.update(users).set({ role }).where(eq(users.id, userId));
  return result;
}

export async function updateAccountClassification(
  userId: number,
  accountClassification: AccountClassification
) {
  const db = await getDb();
  if (!db) return null;

  return db
    .update(users)
    .set({ accountClassification })
    .where(eq(users.id, userId));
}

// ─── Restaurant Holidays ──────────────────────────────────────────────────────
export async function getHolidaysByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurantHolidays).where(eq(restaurantHolidays.restaurantId, restaurantId)).orderBy(restaurantHolidays.date);
}

export async function createHoliday(data: InsertRestaurantHoliday) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(restaurantHolidays).values(data);
  return result.insertId;
}

export async function updateHoliday(id: number, data: Partial<InsertRestaurantHoliday>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(restaurantHolidays).set(data).where(eq(restaurantHolidays.id, id));
}

export async function deleteHoliday(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(restaurantHolidays).where(eq(restaurantHolidays.id, id));
}

export async function getHolidayById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [holiday] = await db.select().from(restaurantHolidays).where(eq(restaurantHolidays.id, id));
  return holiday || null;
}

// ─── Restaurant Tables helpers ─────────────────────────────────

export async function getTablesByRestaurant(restaurantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(restaurantTables).where(eq(restaurantTables.restaurantId, restaurantId)).orderBy(restaurantTables.tableNumber);
}

export async function getTableById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [table] = await db.select().from(restaurantTables).where(eq(restaurantTables.id, id));
  return table || null;
}
export async function getTableByRestaurantAndNumber(restaurantId: number, tableNumber: number) {
  const db = await getDb();
  if (!db) return null;
  const [table] = await db.select().from(restaurantTables).where(and(eq(restaurantTables.restaurantId, restaurantId), eq(restaurantTables.tableNumber, tableNumber)));
  return table || null;
}

export async function createTable(data: InsertRestaurantTable) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(restaurantTables).values(data).$returningId();
  return result;
}

export async function updateTable(id: number, data: Partial<InsertRestaurantTable>) {
  const db = await getDb();
  if (!db) return;
  await db.update(restaurantTables).set(data).where(eq(restaurantTables.id, id));
}

export async function deleteTable(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(restaurantTables).where(eq(restaurantTables.id, id));
}

export async function createMultipleTables(restaurantId: number, count: number, startFrom: number = 1) {
  const db = await getDb();
  if (!db) return [];
  const tables: InsertRestaurantTable[] = [];
  for (let i = 0; i < count; i++) {
    tables.push({
      restaurantId,
      tableNumber: startFrom + i,
      nameAr: `طاولة ${startFrom + i}`,
      nameEn: `Table ${startFrom + i}`,
    });
  }
  await db.insert(restaurantTables).values(tables);
  return getTablesByRestaurant(restaurantId);
}

// ─── Orders helpers ────────────────────────────────────────────

export async function getOrdersByRestaurant(restaurantId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(orders)
      .where(and(eq(orders.restaurantId, restaurantId), eq(orders.status, status as any)))
      .orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders)
    .where(eq(orders.restaurantId, restaurantId))
    .orderBy(desc(orders.createdAt));
}

export type SessionLinkedOrderRow = {
  id: number;
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  status: string;
  totalAmount: string;
  createdAt: string;
};

/** TABLE-MANAGEMENT-1 UX-1B — orders linked to a dining session (no items). */
export async function getOrdersBySessionId(
  restaurantId: number,
  sessionId: number
): Promise<SessionLinkedOrderRow[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      businessDay: orders.businessDay,
      dailyDisplayNumber: orders.dailyDisplayNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, restaurantId), eq(orders.sessionId, sessionId)))
    .orderBy(desc(orders.createdAt));
}

/**
 * CHECK-GENERALIZATION-M3 — load Order money rows by id for Check membership discovery.
 */
export async function getOrdersByIds(
  restaurantId: number,
  orderIds: readonly number[]
): Promise<SessionLinkedOrderRow[]> {
  const db = await getDb();
  if (!db || orderIds.length === 0) return [];

  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      businessDay: orders.businessDay,
      dailyDisplayNumber: orders.dailyDisplayNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(eq(orders.restaurantId, restaurantId), inArray(orders.id, [...orderIds]))
    )
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersWithItemsByRestaurant(
  restaurantId: number,
  status?: string
) {
  const orderList = await getOrdersByRestaurant(restaurantId, status);
  return Promise.all(
    orderList.map(async (order) => ({
      ...order,
      items: await getOrderItemsByOrderId(order.id),
    }))
  );
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  return order || null;
}

/** PR-CUX-1B — read-only public lookup by tracking token + restaurant slug (tenant boundary). */
export async function getOrderByTrackingToken(
  trackingToken: string,
  restaurantSlug: string
) {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      orderId: orders.id,
      restaurantId: restaurants.id,
      sessionId: orders.sessionId,
      orderNumber: orders.orderNumber,
      businessDay: orders.businessDay,
      dailyDisplayNumber: orders.dailyDisplayNumber,
      identityScope: orders.identityScope,
      serviceMode: orders.serviceMode,
      fulfilmentAnchorType: orders.fulfilmentAnchorType,
      tableNumber: orders.tableNumber,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      readyAt: orders.readyAt,
      nameAr: restaurants.nameAr,
      nameEn: restaurants.nameEn,
      currencySymbol: restaurants.currencySymbol,
      tableLabel: restaurants.tableLabel,
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(
      and(eq(orders.trackingToken, trackingToken), eq(restaurants.slug, restaurantSlug))
    )
    .limit(1);

  if (!row) return null;

  const [countRow] = await db
    .select({
      itemCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, row.orderId));

  return {
    ...row,
    itemCount: Number(countRow?.itemCount ?? 0),
  };
}

export async function createOrder(data: InsertOrder) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(orders).values(data);
  return { id: result[0].insertId };
}

export async function updateOrderStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, id));
}

/** TRACKING-EXPIRY-1 — set once when order first enters READY; never overwritten. */
export async function markOrderReadyAtIfFirstTransition(
  orderId: number,
  previousStatus: string,
  newStatus: string
): Promise<void> {
  if (previousStatus === "ready" || newStatus !== "ready") return;
  const db = await getDb();
  if (!db) return;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db
    .update(orders)
    .set({ readyAt: now })
    .where(and(eq(orders.id, orderId), isNull(orders.readyAt)));
}

export async function getOrderItemsByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function createOrderItems(items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) return;
  await db.insert(orderItems).values(items);
}

export async function generateOrderNumber(restaurantId: number): Promise<string> {
  const db = await getDb();
  if (!db) return `ORD-${Date.now()}`;
  const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.restaurantId, restaurantId));
  const count = (result?.count || 0) + 1;
  return `ORD-${String(count).padStart(4, '0')}`;
}

export async function getActiveOrdersCount(restaurantId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders)
    .where(and(
      eq(orders.restaurantId, restaurantId),
      inArray(orders.status, ['pending', 'preparing', 'ready'])
    ));
  return result?.count || 0;
}

// ─── Customer Push Subscriptions (BACKGROUND-NOTIFICATIONS-1A) ───

export type CustomerPushSubscriptionRow = {
  id: number;
  orderId: number;
  trackingToken: string;
  endpoint: string;
  endpointHash: string;
  p256dh: string;
  auth: string;
  expiresAt: string | null;
};

export async function upsertCustomerPushSubscription(
  data: InsertCustomerPushSubscription & {
    orderId: number;
    trackingToken: string;
    endpoint: string;
    endpointHash: string;
    p256dh: string;
    auth: string;
    expiresAt: string;
  }
): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(customerPushSubscriptions)
    .values({
      orderId: data.orderId,
      trackingToken: data.trackingToken,
      endpoint: data.endpoint,
      endpointHash: data.endpointHash,
      p256dh: data.p256dh,
      auth: data.auth,
      expiresAt: data.expiresAt,
    })
    .onDuplicateKeyUpdate({
      set: {
        trackingToken: data.trackingToken,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        expiresAt: data.expiresAt,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  const [row] = await db
    .select({ id: customerPushSubscriptions.id })
    .from(customerPushSubscriptions)
    .where(
      and(
        eq(customerPushSubscriptions.orderId, data.orderId),
        eq(customerPushSubscriptions.endpointHash, data.endpointHash)
      )
    )
    .limit(1);

  if (!row) throw new Error("Failed to upsert push subscription");
  return { id: row.id };
}

export async function deletePushSubscriptionByEndpointHash(
  orderId: number,
  endpointHash: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(customerPushSubscriptions)
    .where(
      and(
        eq(customerPushSubscriptions.orderId, orderId),
        eq(customerPushSubscriptions.endpointHash, endpointHash)
      )
    );
}

export async function deletePushSubscriptionsForOrder(orderId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(customerPushSubscriptions)
    .where(eq(customerPushSubscriptions.orderId, orderId));
}

export async function getActivePushSubscriptionsForOrder(
  orderId: number
): Promise<CustomerPushSubscriptionRow[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  return db
    .select({
      id: customerPushSubscriptions.id,
      orderId: customerPushSubscriptions.orderId,
      trackingToken: customerPushSubscriptions.trackingToken,
      endpoint: customerPushSubscriptions.endpoint,
      endpointHash: customerPushSubscriptions.endpointHash,
      p256dh: customerPushSubscriptions.p256dh,
      auth: customerPushSubscriptions.auth,
      expiresAt: customerPushSubscriptions.expiresAt,
    })
    .from(customerPushSubscriptions)
    .where(
      and(
        eq(customerPushSubscriptions.orderId, orderId),
        sql`(${customerPushSubscriptions.expiresAt} IS NULL OR ${customerPushSubscriptions.expiresAt} > ${now})`
      )
    );
}

export async function countExpiredPushSubscriptionsForOrder(orderId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(customerPushSubscriptions)
    .where(
      and(
        eq(customerPushSubscriptions.orderId, orderId),
        sql`${customerPushSubscriptions.expiresAt} IS NOT NULL`,
        sql`${customerPushSubscriptions.expiresAt} <= ${now}`
      )
    );

  return Number(row?.count ?? 0);
}

export async function touchCustomerPushSubscriptionLastUsed(
  subscriptionId: number
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db
    .update(customerPushSubscriptions)
    .set({ lastUsedAt: now })
    .where(eq(customerPushSubscriptions.id, subscriptionId));
  return now;
}

export async function claimReadyPushSend(orderId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const result = await db
    .update(orders)
    .set({ readyPushSentAt: now })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, "ready"),
        isNull(orders.readyPushSentAt)
      )
    );
  return readMysqlAffectedRows(result) > 0;
}

export async function releaseReadyPushSend(orderId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(orders)
    .set({ readyPushSentAt: null })
    .where(eq(orders.id, orderId));
}

export async function getOrderPushContext(orderId: number): Promise<{
  orderId: number;
  orderNumber: string;
  trackingToken: string | null;
  slug: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      trackingToken: orders.trackingToken,
      slug: restaurants.slug,
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  return row ?? null;
}
