import { eq, and, asc, desc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
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
} from "../drizzle/schema";
import { ENV } from './_core/env';
import {
  parseStoredUtcInstant,
  isInBusinessYearMonth,
  businessYearMonthMonthsAgo,
  formatBusinessYearMonthLabel,
} from "@shared/utils/timezone";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
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
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot update user: database not available"); return; }
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.email !== undefined) updateSet.email = data.email;
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

export async function deleteRestaurant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all items and categories first
  await db.delete(menuItems).where(eq(menuItems.restaurantId, id));
  await db.delete(categories).where(eq(categories.restaurantId, id));
  
  // Delete the restaurant
  await db.delete(restaurants).where(eq(restaurants.id, id));
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


// ─── Subscription Plan helpers ──────────────────────────────

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

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId)).limit(1);
  return result[0];
}

export async function createUserSubscription(data: InsertUserSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(userSubscriptions).values(data);
  return { id: result[0].insertId };
}

export async function updateUserSubscription(userId: number, data: Partial<InsertUserSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userSubscriptions).set(data).where(eq(userSubscriptions.userId, userId));
}

export async function isSubscriptionActive(userId: number): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;
  
  const now = new Date();
  // TODO(TZ-6B): Do not parse stored timestamps with `new Date(dbString)` when the DB string
  // may be a UTC DATETIME without timezone suffix. Use `parseStoredUtcInstant(...)` from
  // `shared/utils/timezone.ts` and compare instants deterministically (Riyadh-first baseline).
  
  // Check if in trial period
  if (subscription.status === "trial" && subscription.trialEndsAt) {
    return now < new Date(subscription.trialEndsAt);
  }
  
  // Check if active subscription
  if (subscription.status === "active") {
    return now < new Date(subscription.currentPeriodEnd);
  }
  
  return false;
}

export async function getTrialEndDate(userId: number): Promise<Date | null> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return null;
  // TODO(TZ-6B): Normalize trialEndsAt parsing via `parseStoredUtcInstant(...)` before returning.
  return subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
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

export async function getSubscriptionByRestaurantId(restaurantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userSubscriptions).where(eq(userSubscriptions.restaurantId, restaurantId)).limit(1);
  return result[0];
}

/** Per-restaurant subscription first; otherwise owner's user-level subscription row. */
export async function getOrderingSubscriptionForRestaurant(restaurantId: number) {
  const byRestaurant = await getSubscriptionByRestaurantId(restaurantId);
  if (byRestaurant) return byRestaurant;
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return undefined;
  return getUserSubscription(restaurant.userId);
}

export async function restaurantAllowsTableOrdering(restaurantId: number): Promise<boolean> {
  const subscription = await getOrderingSubscriptionForRestaurant(restaurantId);
  if (!subscription || !["active", "trial"].includes(subscription.status)) {
    return false;
  }
  const plan = await getSubscriptionPlanById(subscription.planId);
  if (!plan || plan.id === 30001) {
    return false;
  }
  return true;
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

export async function deleteSubscriptionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userSubscriptions).where(eq(userSubscriptions.id, id));
}

export async function getAllRestaurantsWithSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  const allRestaurants = await db.select().from(restaurants);
  const allSubs = await db.select().from(userSubscriptions);
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(users);
  
  return allRestaurants.map(r => {
    const owner = allUsers.find(u => u.id === r.userId) || null;
    return {
      ...r,
      subscription: allSubs.find(s => s.userId === r.userId) || null,
      ownerName: owner?.name || null,
      ownerEmail: owner?.email || null,
    };
  });
}


// Admin Statistics Functions
export async function getAdminStatistics() {
  const db = await getDb();
  if (!db) return null;

  const allSubs = await db.select().from(userSubscriptions);
  const allPlans = await db.select().from(subscriptionPlans);
  
  const activeSubscriptions = allSubs.filter(s => s.status === 'active' || s.status === 'trial');
  const trialSubscriptions = allSubs.filter(s => s.status === 'trial');
  const expiredSubscriptions = allSubs.filter(s => s.status === 'expired');
  const canceledSubscriptions = allSubs.filter(s => s.status === 'canceled');

  // Calculate total revenue (from active subscriptions)
  const totalRevenue = activeSubscriptions.reduce((sum, sub) => {
    const plan = allPlans.find(p => p.id === sub.planId);
    if (!plan) return sum;
    const monthlyPrice = sub.billingCycle === 'yearly' ? (parseFloat(plan.priceYearly || '0') / 12) : parseFloat(plan.priceMonthly || '0');
    return sum + monthlyPrice;
  }, 0);

  // Calculate renewal rate (active + trial / total)
  const renewalRate = allSubs.length > 0 ? ((activeSubscriptions.length + trialSubscriptions.length) / allSubs.length) * 100 : 0;

  // Calculate churn rate (canceled + expired / total)
  const churnRate = allSubs.length > 0 ? ((canceledSubscriptions.length + expiredSubscriptions.length) / allSubs.length) * 100 : 0;

  return {
    totalSubscribers: allSubs.length,
    activeSubscribers: activeSubscriptions.length,
    trialSubscribers: trialSubscriptions.length,
    expiredSubscribers: expiredSubscriptions.length,
    canceledSubscribers: canceledSubscriptions.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    renewalRate: Math.round(renewalRate * 100) / 100,
    churnRate: Math.round(churnRate * 100) / 100,
    subscriptionsByPlan: allPlans.map(plan => ({
      planId: plan.id,
      planName: plan.nameAr,
      count: allSubs.filter(s => s.planId === plan.id && (s.status === 'active' || s.status === 'trial')).length,
    })),
  };
}

export async function getRevenueByMonth(months: number = 12) {
  const db = await getDb();
  if (!db) return [];

  const allSubs = await db.select().from(userSubscriptions);
  const allPlans = await db.select().from(subscriptionPlans);
  
  const now = new Date();
  const revenueData: { month: string; revenue: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    
    const monthRevenue = allSubs
      .filter(s => {
        // DB DATETIME assumed UTC — align with Dashboard TZ-5a parse semantics (TZ-5b.0).
        const createdDate = parseStoredUtcInstant(s.createdAt);
        if (!createdDate) return false;
        return createdDate.getFullYear() === monthDate.getFullYear() && 
               createdDate.getMonth() === monthDate.getMonth() &&
               (s.status === 'active' || s.status === 'trial');
      })
      .reduce((sum, sub) => {
        const plan = allPlans.find(p => p.id === sub.planId);
        if (!plan) return sum;
        const monthlyPrice = sub.billingCycle === 'yearly' ? (parseFloat(plan.priceYearly || '0') / 12) : parseFloat(plan.priceMonthly || '0');
        return sum + monthlyPrice;
      }, 0);

    revenueData.push({
      month: monthStr,
      revenue: Math.round(monthRevenue * 100) / 100,
    });
  }

  return revenueData;
}

export async function getSubscriptionDetails() {
  const db = await getDb();
  if (!db) return [];

  const allSubs = await db.select().from(userSubscriptions);
  const allPlans = await db.select().from(subscriptionPlans);
  const allRestaurants = await db.select().from(restaurants);
  const allUsers = await db.select().from(users);

  return allSubs.map(sub => {
    const plan = allPlans.find(p => p.id === sub.planId);
    const user = allUsers.find(u => u.id === sub.userId);
    // Get the first restaurant for this user
    const restaurant = allRestaurants.find(r => r.userId === sub.userId);
    
    return {
      id: sub.id,
      restaurantName: restaurant?.nameAr || 'Unknown',
      ownerEmail: user?.email || 'Unknown',
      planName: plan?.nameAr || 'Unknown',
      billingCycle: sub.billingCycle,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      createdAt: sub.createdAt,
      monthlyPrice: sub.billingCycle === 'monthly' ? parseFloat(plan?.priceMonthly || '0') : (parseFloat(plan?.priceYearly || '0') / 12),
    };
  });
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
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

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

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.delete(users).where(eq(users.id, userId));
  return result;
}

// ─── Get All Users With Subscriptions ───────────────────────
export async function getAllUsersWithSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  const allUsers = await db.select().from(users);
  const allSubs = await db.select().from(userSubscriptions);
  const allPlans = await db.select().from(subscriptionPlans);
  const allRestaurants = await db.select().from(restaurants);
  return allUsers.map(u => {
    const subscription = allSubs.find(s => s.userId === u.id) || null;
    const plan = subscription ? allPlans.find(p => p.id === subscription.planId) || null : null;
    const userRestaurants = allRestaurants.filter(r => r.userId === u.id);
    return {
      ...u,
      subscription,
      plan,
      restaurants: userRestaurants,
    };
  });
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
