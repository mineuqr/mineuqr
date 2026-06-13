import { mysqlTable, mysqlSchema, AnyMySqlColumn, bigint, int, varchar, text, timestamp, decimal, mysqlEnum, index, uniqueIndex, boolean, json } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

// ─── Categories Table ──────────────────────────────────────
export const categories = mysqlTable("categories", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	nameAr: varchar({ length: 255 }).notNull(),
	nameEn: varchar({ length: 255 }),
	descriptionAr: text(),
	descriptionEn: text(),
	iconName: varchar({ length: 64 }),
	sortOrder: int().default(0).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Menu Items Table ──────────────────────────────────────
export const menuItems = mysqlTable("menu_items", {
	id: int().autoincrement().notNull(),
	categoryId: int().notNull(),
	restaurantId: int().notNull(),
	nameAr: varchar({ length: 255 }).notNull(),
	nameEn: varchar({ length: 255 }),
	descriptionAr: text(),
	descriptionEn: text(),
	price: decimal({ precision: 10, scale: 2 }).notNull(),
	imageUrl: text(),
	isAvailable: boolean().default(true).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	calories: int(),
});

// ─── Offers Table ──────────────────────────────────────────
export const offers = mysqlTable("offers", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	titleAr: varchar({ length: 255 }).notNull(),
	titleEn: varchar({ length: 255 }),
	descriptionAr: text(),
	descriptionEn: text(),
	offerType: mysqlEnum(['daily','weekly','monthly']).notNull(),
	originalPrice: decimal({ precision: 10, scale: 2 }).notNull(),
	offerPrice: decimal({ precision: 10, scale: 2 }).notNull(),
	imageUrl: text(),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Restaurants Table ─────────────────────────────────────
export const restaurants = mysqlTable("restaurants", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	slug: varchar({ length: 128 }).notNull(),
	nameAr: varchar({ length: 255 }).notNull(),
	nameEn: varchar({ length: 255 }),
	descriptionAr: text(),
	descriptionEn: text(),
	logoUrl: text(),
	coverUrl: text(),
	ownerEmail: varchar({ length: 320 }),
	phone: varchar({ length: 32 }),
	address: text(),
	countryCode: varchar({ length: 2 }),
	currencyCode: varchar({ length: 3 }).default('SAR'),
	currencySymbol: varchar({ length: 10 }).default('ر.س'),
	isActive: boolean().default(true).notNull(),
	viewCount: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	menuTemplate: varchar({ length: 32 }).default('classic').notNull(),
	customColors: text(),
	customFonts: text(),
	whatsapp: varchar({ length: 32 }),
	snapchat: varchar({ length: 128 }),
	instagram: varchar({ length: 128 }),
	xTwitter: varchar({ length: 128 }),
	locationUrl: text(),
	workingHours: text(),
	temporaryClosure: text(),
	tableLabel: mysqlEnum('table_label', ['tables','rooms']).default('tables').notNull(),
},
(table) => [
	index("restaurants_slug_unique").on(table.slug),
]);

// ─── Subscription Plans Table ──────────────────────────────
export const subscriptionPlans = mysqlTable("subscription_plans", {
	id: int().autoincrement().notNull(),
	nameAr: varchar({ length: 255 }).notNull(),
	nameEn: varchar({ length: 255 }).notNull(),
	descriptionAr: text(),
	descriptionEn: text(),
	priceMonthly: decimal({ precision: 10, scale: 2 }).notNull(),
	priceYearly: decimal({ precision: 10, scale: 2 }),
	maxRestaurants: int().default(1).notNull(),
	maxItemsPerRestaurant: int().default(100).notNull(),
	maxCategories: int().default(10).notNull(),
	features: text(),
	featuresAr: text(),
	stripePriceIdMonthly: varchar({ length: 255 }),
	stripePriceIdYearly: varchar({ length: 255 }),
	isActive: boolean().default(true).notNull(),
	sortOrder: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── User Subscriptions Table ──────────────────────────────
export const userSubscriptions = mysqlTable("user_subscriptions", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	restaurantId: int().notNull(),
	planId: int().notNull(),
	status: mysqlEnum(['active','canceled','expired','trial']).default('trial').notNull(),
	billingCycle: mysqlEnum(['monthly','yearly']).default('monthly').notNull(),
	stripeSubscriptionId: varchar({ length: 255 }),
	stripeCustomerId: varchar({ length: 255 }),
	currentPeriodStart: timestamp({ mode: 'string' }).notNull(),
	currentPeriodEnd: timestamp({ mode: 'string' }).notNull(),
	trialEndsAt: timestamp({ mode: 'string' }),
	canceledAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Audit Events Table (ADMIN-SECURITY-CENTER PR-5) ───────
export const auditEvents = mysqlTable(
  "audit_events",
  {
    id: bigint({ mode: "number" }).autoincrement().primaryKey(),
    eventType: varchar({ length: 64 }).notNull(),
    eventVersion: int().default(1).notNull(),
    category: mysqlEnum(["ACCESS", "USER", "SUBSCRIPTION", "COMMERCIAL", "SECURITY"]).notNull(),
    severity: mysqlEnum(["info", "warn", "error"]).notNull(),
    occurredAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
    actorId: int(),
    actorRole: varchar({ length: 16 }),
    targetType: varchar({ length: 32 }),
    targetId: int(),
    procedure: varchar({ length: 128 }),
    correlationId: varchar({ length: 64 }),
    ip: varchar({ length: 45 }),
    before: json(),
    after: json(),
    metadata: json(),
  },
  (table) => [
    index("audit_events_occurred_at_idx").on(table.occurredAt),
    index("audit_events_event_type_occurred_at_idx").on(table.eventType, table.occurredAt),
    index("audit_events_actor_id_occurred_at_idx").on(table.actorId, table.occurredAt),
    index("audit_events_target_occurred_at_idx").on(
      table.targetType,
      table.targetId,
      table.occurredAt
    ),
    index("audit_events_category_occurred_at_idx").on(table.category, table.occurredAt),
  ]
);

export type InsertAuditEvent = typeof auditEvents.$inferInsert;
export type SelectAuditEvent = typeof auditEvents.$inferSelect;

// ─── Users Table ───────────────────────────────────────────
export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	passwordHash: varchar({ length: 255 }),
	emailVerifiedAt: timestamp({ mode: 'string' }),
	passwordChangedAt: timestamp({ mode: 'string' }),
	/** Stateless session revocation boundary (AUTH2-C Slice 3B.3). */
	sessionValidAfter: timestamp({ mode: 'string' }),
	/** ADMIN-AUTH-1B — analytics population; independent from role. */
	accountClassification: mysqlEnum(['COMMERCIAL','INTERNAL','SYSTEM']).default('COMMERCIAL').notNull(),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("users_openId_unique").on(table.openId),
	uniqueIndex("users_email_unique").on(table.email),
]);

// ─── Auth Tokens Table (Password reset / Email verification) ───────────────────
export const authTokens = mysqlTable(
  "auth_tokens",
  {
    id: int().autoincrement().notNull(),
    userId: int().notNull(),
    type: mysqlEnum(["password_reset", "email_verify"]).notNull(),
    tokenHash: varchar({ length: 64 }).notNull(), // sha256 hex
    expiresAt: timestamp({ mode: "string" }).notNull(),
    usedAt: timestamp({ mode: "string" }),
    createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
  },
  (table) => [
    index("auth_tokens_user_id").on(table.userId),
    index("auth_tokens_token_hash").on(table.tokenHash),
    index("auth_tokens_type").on(table.type),
  ]
);

// ─── Invoices Table ────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	subscriptionId: int().notNull(),
	amount: decimal({ precision: 10, scale: 2 }).notNull(),
	currency: varchar({ length: 3 }).default('USD').notNull(),
	status: mysqlEnum(['pending','paid','failed','refunded']).default('pending').notNull(),
	invoiceNumber: varchar({ length: 64 }).notNull(),
	pdfUrl: text(),
	issuedAt: timestamp({ mode: 'string' }).notNull(),
	dueAt: timestamp({ mode: 'string' }).notNull(),
	paidAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Countries & Currencies Table ─────────────────────────────
export const countriesCurrencies = mysqlTable("countries_currencies", {
	id: int().autoincrement().notNull(),
	countryNameAr: varchar({ length: 255 }).notNull(),
	countryNameEn: varchar({ length: 255 }).notNull(),
	countryCode: varchar({ length: 2 }).notNull(),
	currencyCode: varchar({ length: 3 }).notNull(),
	currencySymbol: varchar({ length: 10 }).notNull(),
	currencyNameAr: varchar({ length: 255 }).notNull(),
	currencyNameEn: varchar({ length: 255 }).notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("countries_currencies_code_unique").on(table.countryCode),
]);

// ─── Renewal Notifications Table ────────────────────────────
export const renewalNotifications = mysqlTable("renewal_notifications", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	subscriptionId: int(),
	notificationType: mysqlEnum(['7_days_before','1_day_before','on_renewal','failed_renewal','subscription_created','subscription_updated','subscription_deleted','subscription_activated','role_changed','custom_message','new_order']).notNull(),
	message: varchar({ length: 500 }),
	isRead: boolean().default(false).notNull(),
	isSent: boolean().default(false).notNull(),
	sentAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ─── Type Exports ──────────────────────────────────────────
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertAuthToken = typeof authTokens.$inferInsert;
export type SelectAuthToken = typeof authTokens.$inferSelect;

export type InsertRestaurant = typeof restaurants.$inferInsert;
export type SelectRestaurant = typeof restaurants.$inferSelect;

export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;

export type InsertMenuItem = typeof menuItems.$inferInsert;
export type SelectMenuItem = typeof menuItems.$inferSelect;

export type InsertOffer = typeof offers.$inferInsert;
export type SelectOffer = typeof offers.$inferSelect;

export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SelectSubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;
export type SelectUserSubscription = typeof userSubscriptions.$inferSelect;

export type InsertInvoice = typeof invoices.$inferInsert;
export type SelectInvoice = typeof invoices.$inferSelect;

export type InsertRenewalNotification = typeof renewalNotifications.$inferInsert;
export type SelectRenewalNotification = typeof renewalNotifications.$inferSelect;

export type InsertCountryCurrency = typeof countriesCurrencies.$inferInsert;
export type SelectCountryCurrency = typeof countriesCurrencies.$inferSelect;

// ─── Restaurant Holidays Table ────────────────────────────────────────────────────────────────────────────────────────────────
export const restaurantHolidays = mysqlTable("restaurant_holidays", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	titleAr: varchar({ length: 255 }).notNull(),
	titleEn: varchar({ length: 255 }),
	date: varchar({ length: 10 }).notNull(),
	isFullDayClosed: boolean().default(true).notNull(),
	openTime: varchar({ length: 5 }),
	closeTime: varchar({ length: 5 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export type InsertRestaurantHoliday = typeof restaurantHolidays.$inferInsert;
export type SelectRestaurantHoliday = typeof restaurantHolidays.$inferSelect;

// ─── Restaurant Tables (Dining Tables) ────────────────────────────
export const restaurantTables = mysqlTable("restaurant_tables", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	tableNumber: int().notNull(),
	nameAr: varchar({ length: 100 }),
	nameEn: varchar({ length: 100 }),
	qrCodeUrl: text(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("restaurant_tables_restaurant_id").on(table.restaurantId),
]);

// ─── Orders Table ─────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	tableId: int().notNull(),
	tableNumber: int().notNull(),
	customerName: varchar({ length: 255 }),
	customerPhone: varchar({ length: 32 }),
	status: mysqlEnum(['pending','preparing','ready','served','cancelled']).default('pending').notNull(),
	notes: text(),
	totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	orderNumber: varchar({ length: 32 }).notNull(),
	trackingToken: varchar({ length: 64 }),
	readyPushSentAt: timestamp({ mode: 'string' }),
	whatsappSent: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("orders_restaurant_id").on(table.restaurantId),
	index("orders_table_id").on(table.tableId),
	index("orders_status").on(table.status),
	uniqueIndex("orders_tracking_token_unique").on(table.trackingToken),
]);

// ─── Customer Push Subscriptions (BACKGROUND-NOTIFICATIONS-1A) ───
export const customerPushSubscriptions = mysqlTable("customer_push_subscriptions", {
	id: int().autoincrement().notNull(),
	orderId: int().notNull(),
	trackingToken: varchar({ length: 64 }).notNull(),
	endpoint: varchar({ length: 512 }).notNull(),
	endpointHash: varchar({ length: 64 }).notNull(),
	p256dh: varchar({ length: 255 }).notNull(),
	auth: varchar({ length: 255 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	expiresAt: timestamp({ mode: 'string' }),
	lastUsedAt: timestamp({ mode: 'string' }),
},
(table) => [
	uniqueIndex("uq_push_endpoint_hash_order").on(table.orderId, table.endpointHash),
	index("idx_push_tracking_token").on(table.trackingToken),
	index("idx_push_expires_at").on(table.expiresAt),
]);

// ─── Order Items Table ────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
	id: int().autoincrement().notNull(),
	orderId: int().notNull(),
	menuItemId: int().notNull(),
	nameAr: varchar({ length: 255 }).notNull(),
	nameEn: varchar({ length: 255 }),
	price: decimal({ precision: 10, scale: 2 }).notNull(),
	quantity: int().default(1).notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("order_items_order_id").on(table.orderId),
]);

export type InsertRestaurantTable = typeof restaurantTables.$inferInsert;
export type SelectRestaurantTable = typeof restaurantTables.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;

export type InsertCustomerPushSubscription = typeof customerPushSubscriptions.$inferInsert;
export type SelectCustomerPushSubscription = typeof customerPushSubscriptions.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type SelectOrderItem = typeof orderItems.$inferSelect;
