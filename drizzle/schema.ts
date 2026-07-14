import { mysqlTable, mysqlSchema, AnyMySqlColumn, bigint, int, tinyint, varchar, text, timestamp, decimal, mysqlEnum, index, uniqueIndex, boolean, json, primaryKey } from "drizzle-orm/mysql-core"
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
	image: json(),
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

// ─── Dining Sessions (TABLE-MANAGEMENT-1 Phase C) ───────────────
export const diningSessions = mysqlTable("dining_sessions", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	tableId: int().notNull(),
	tableNumber: int().notNull(),
	sessionToken: varchar({ length: 64 }).notNull(),
	status: mysqlEnum(['open','paid','complimentary','closed']).default('open').notNull(),
	/** 1 while active; NULL when closed — UNIQUE(restaurantId, tableId, openGuard) enforces one active session per table. */
	openGuard: tinyint(),
	openedAt: timestamp({ mode: 'string' }).notNull(),
	/** When settlement was recorded (paid or complimentary). */
	settledAt: timestamp({ mode: 'string' }),
	/** Persisted on closed rows for settlement reporting. Null for manual close override. */
	settlementOutcome: mysqlEnum(['paid','complimentary']),
	closedAt: timestamp({ mode: 'string' }),
	totalAmount: decimal({ precision: 10, scale: 2 }),
	totalOrders: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	uniqueIndex("dining_sessions_session_token_unique").on(table.sessionToken),
	index("dining_sessions_restaurant_id").on(table.restaurantId),
	index("dining_sessions_table_id").on(table.tableId),
	index("dining_sessions_status").on(table.status),
	index("dining_sessions_restaurant_id_table_id").on(table.restaurantId, table.tableId),
	index("dining_sessions_restaurant_id_status_opened_at").on(table.restaurantId, table.status, table.openedAt),
	uniqueIndex("dining_sessions_restaurant_id_table_id_open_guard").on(table.restaurantId, table.tableId, table.openGuard),
]);

export type InsertDiningSession = typeof diningSessions.$inferInsert;
export type SelectDiningSession = typeof diningSessions.$inferSelect;

// ─── Table Events (TABLE-MANAGEMENT-1 Phase C) ──────────────────
export const tableEvents = mysqlTable("table_events", {
	id: bigint({ mode: "number" }).autoincrement().primaryKey(),
	restaurantId: int().notNull(),
	tableId: int().notNull(),
	sessionId: int(),
	orderId: int(),
	eventType: varchar({ length: 32 }).notNull(),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
},
(table) => [
	index("table_events_session_id_created_at").on(table.sessionId, table.createdAt),
	index("table_events_restaurant_id_created_at").on(table.restaurantId, table.createdAt),
]);

export type InsertTableEvent = typeof tableEvents.$inferInsert;
export type SelectTableEvent = typeof tableEvents.$inferSelect;

// ─── Orders Table ─────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	tableId: int().notNull(),
	tableNumber: int().notNull(),
	sessionId: int(),
	/** OPERATIONAL-FULFILMENT-PROJECTION-1 — dual-write stamps for read projection. */
	serviceMode: varchar({ length: 32 }),
	fulfilmentAnchorType: varchar({ length: 32 }),
	fulfilmentLabel: varchar({ length: 128 }),
	customerName: varchar({ length: 255 }),
	customerPhone: varchar({ length: 32 }),
	status: mysqlEnum(['pending','preparing','ready','served','cancelled']).default('pending').notNull(),
	lifecycleStage: mysqlEnum(["active", "completed", "archived"]).default("active").notNull(),
	notes: text(),
	totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	orderNumber: varchar({ length: 32 }).notNull(),
	businessDay: varchar({ length: 10 }),
	dailyDisplayNumber: int("daily_display_number"),
	/** KIOSK-PRESENTATION-ADOPTION-1 — TABLE | KIOSK sequence partition. */
	identityScope: varchar({ length: 16 }),
	trackingToken: varchar({ length: 64 }),
	readyPushSentAt: timestamp({ mode: 'string' }),
	readyAt: timestamp({ mode: 'string' }),
	whatsappSent: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("orders_restaurant_id").on(table.restaurantId),
	index("orders_table_id").on(table.tableId),
	index("orders_status").on(table.status),
	index("orders_lifecycle_stage").on(table.lifecycleStage),
	index("orders_session_id").on(table.sessionId),
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

// ─── Order Business Day Sequences (ORDER-IDENTITY-AND-BUSINESS-DAY-1) ─
export const orderBusinessDaySequences = mysqlTable("order_business_day_sequences", {
	restaurantId: int("restaurant_id").notNull(),
	businessDay: varchar("business_day", { length: 10 }).notNull(),
	identityScope: varchar("identity_scope", { length: 16 }).notNull(),
	lastNumber: int("last_number").default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId, table.businessDay, table.identityScope] }),
]);

// ─── Order Read Projections (ORDERS-READ-MODEL-1 Phase 2) ─────────
export const orderReadOrders = mysqlTable("order_read_orders", {
	restaurantId: int().notNull(),
	orderId: int().notNull(),
	orderNumber: varchar({ length: 32 }).notNull(),
	businessDay: varchar({ length: 10 }),
	dailyDisplayNumber: int("daily_display_number"),
	identityScope: varchar({ length: 16 }),
	status: mysqlEnum(["pending", "preparing", "ready", "served", "cancelled"]).notNull(),
	lifecycleStage: mysqlEnum(["active", "completed", "archived"]).default("active").notNull(),
	tableId: int().notNull(),
	tableNumber: int().notNull(),
	sessionId: int(),
	serviceMode: varchar({ length: 32 }),
	fulfilmentAnchorType: varchar({ length: 32 }),
	fulfilmentLabel: varchar({ length: 128 }),
	customerName: varchar({ length: 255 }),
	customerPhone: varchar({ length: 32 }),
	notes: text(),
	totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	trackingToken: varchar({ length: 64 }),
	createdAt: timestamp({ mode: "string" }).notNull(),
	readyAt: timestamp({ mode: "string" }),
	servedAt: timestamp({ mode: "string" }),
	cancelledAt: timestamp({ mode: "string" }),
	isActive: boolean().default(false).notNull(),
	projectionSchemaVersion: int().default(1).notNull(),
	lastEventId: varchar({ length: 36 }),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId, table.orderId] }),
	index("order_read_orders_restaurant_active").on(table.restaurantId, table.isActive),
	index("order_read_orders_restaurant_lifecycle").on(table.restaurantId, table.lifecycleStage),
	index("order_read_orders_restaurant_status").on(table.restaurantId, table.status),
	index("order_read_orders_restaurant_created").on(table.restaurantId, table.createdAt),
]);

export const orderReadOrderLineItems = mysqlTable("order_read_order_line_items", {
	restaurantId: int().notNull(),
	orderId: int().notNull(),
	lineItemId: int().notNull(),
	menuItemId: int().notNull(),
	nameAr: varchar({ length: 255 }).notNull(),
	nameEn: varchar({ length: 255 }),
	quantity: int().notNull(),
	price: decimal({ precision: 10, scale: 2 }).notNull(),
	/** ORDERING-READ-ITEM-NOTES-PERSISTENCE-1 — projected Item Notes from order_items.notes */
	itemNotes: text(),
	lineProjectionType: varchar({ length: 16 }).default("MenuItem").notNull(),
	categoryProjection: json(),
	offerProjection: json(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId, table.orderId, table.lineItemId] }),
	index("order_read_line_items_order").on(table.restaurantId, table.orderId),
]);

export const orderReadOrderTimeline = mysqlTable("order_read_order_timeline", {
	restaurantId: int().notNull(),
	orderId: int().notNull(),
	eventId: varchar({ length: 36 }).notNull(),
	fromStatus: varchar({ length: 32 }),
	toStatus: varchar({ length: 32 }).notNull(),
	occurredAt: timestamp({ mode: "string" }).notNull(),
	projectionSchemaVersion: int().default(1).notNull(),
	lastEventId: varchar({ length: 36 }),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId, table.orderId, table.eventId] }),
	index("order_read_timeline_order").on(table.restaurantId, table.orderId, table.occurredAt),
]);

export const orderReadOperationalKpiDaily = mysqlTable("order_read_operational_kpi_daily", {
	restaurantId: int().notNull(),
	dayKey: varchar({ length: 10 }).notNull(),
	activeOrders: int().default(0).notNull(),
	pendingOrders: int().default(0).notNull(),
	preparingOrders: int().default(0).notNull(),
	readyOrders: int().default(0).notNull(),
	projectionSchemaVersion: int().default(1).notNull(),
	lastEventId: varchar({ length: 36 }),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId, table.dayKey] }),
]);

export const orderReadAnalyticsDaily = mysqlTable("order_read_analytics_daily", {
	restaurantId: int().notNull(),
	dayKey: varchar({ length: 10 }).notNull(),
	orderCount: int().default(0).notNull(),
	completedOrderCount: int().default(0).notNull(),
	completedSales: decimal({ precision: 12, scale: 2 }).default("0.00").notNull(),
	projectionSchemaVersion: int().default(1).notNull(),
	lastEventId: varchar({ length: 36 }),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId, table.dayKey] }),
]);

export const orderReadPublicOrderStatus = mysqlTable("order_read_public_order_status", {
	trackingToken: varchar({ length: 64 }).notNull(),
	restaurantSlug: varchar({ length: 128 }).notNull(),
	restaurantId: int().notNull(),
	orderNumber: varchar({ length: 32 }).notNull(),
	businessDay: varchar({ length: 10 }),
	dailyDisplayNumber: int("daily_display_number"),
	identityScope: varchar({ length: 16 }),
	status: varchar({ length: 32 }).notNull(),
	tableNumber: int().notNull(),
	itemCount: int().default(0).notNull(),
	totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	createdAt: timestamp({ mode: "string" }).notNull(),
	readyAt: timestamp({ mode: "string" }),
	projectionSchemaVersion: int().default(1).notNull(),
	lastEventId: varchar({ length: 36 }),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.trackingToken, table.restaurantSlug] }),
	index("order_read_public_restaurant").on(table.restaurantId),
]);

export const orderReadBackfillRuns = mysqlTable("order_read_backfill_runs", {
	id: varchar({ length: 36 }).notNull(),
	scope: mysqlEnum(["full", "tenant", "partial"]).notNull(),
	restaurantId: int(),
	fromDayKey: varchar({ length: 10 }),
	toDayKey: varchar({ length: 10 }),
	status: mysqlEnum(["pending", "running", "completed", "failed"]).default("pending").notNull(),
	rowsProcessed: int().default(0).notNull(),
	attemptCount: int().default(0).notNull(),
	lastError: text(),
	startedAt: timestamp({ mode: "string" }),
	completedAt: timestamp({ mode: "string" }),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.id] }),
	index("order_read_backfill_restaurant").on(table.restaurantId),
	index("order_read_backfill_status").on(table.status),
]);

// ─── Printing Service (PRINTING-1) ───────────────────────────────
export const printJobStatuses = [
	"pending",
	"dispatched",
	"printing",
	"printed",
	"failed",
	"cancelled",
] as const;

export const printJobSources = ["order_event", "operator", "reprint"] as const;

export const printJobAttemptOutcomes = ["in_progress", "success", "failure", "cancelled"] as const;

export const printJobs = mysqlTable("print_jobs", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	orderId: int().notNull(),
	orderNumber: varchar({ length: 32 }).notNull(),
	status: mysqlEnum(printJobStatuses).default("pending").notNull(),
	source: mysqlEnum(printJobSources).notNull(),
	idempotencyKey: varchar({ length: 128 }).notNull(),
	triggerEventType: varchar({ length: 64 }),
	triggerEventId: varchar({ length: 36 }),
	correlationId: varchar({ length: 64 }),
	payloadVersion: int().default(1).notNull(),
	payloadJson: json().notNull(),
	attemptCount: int().default(0).notNull(),
	lastError: text(),
	operatorUserId: int(),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	dispatchedAt: timestamp({ mode: "string" }),
	printingAt: timestamp({ mode: "string" }),
	completedAt: timestamp({ mode: "string" }),
},
(table) => [
	primaryKey({ columns: [table.id] }),
	uniqueIndex("print_jobs_idempotency_unique").on(table.restaurantId, table.idempotencyKey),
	index("print_jobs_restaurant_status").on(table.restaurantId, table.status),
	index("print_jobs_restaurant_order").on(table.restaurantId, table.orderId),
]);

export const printJobAttempts = mysqlTable("print_job_attempts", {
	id: int().autoincrement().notNull(),
	printJobId: int().notNull(),
	restaurantId: int().notNull(),
	attemptNumber: int().notNull(),
	status: mysqlEnum(printJobStatuses).notNull(),
	outcome: mysqlEnum(printJobAttemptOutcomes).notNull(),
	errorMessage: text(),
	metadataJson: json(),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.id] }),
	index("print_job_attempts_job").on(table.printJobId),
]);

export const printJobHistory = mysqlTable("print_job_history", {
	id: int().autoincrement().notNull(),
	printJobId: int().notNull(),
	restaurantId: int().notNull(),
	eventType: varchar({ length: 64 }).notNull(),
	fromStatus: varchar({ length: 32 }),
	toStatus: varchar({ length: 32 }).notNull(),
	metadataJson: json(),
	occurredAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.id] }),
	index("print_job_history_job").on(table.printJobId, table.occurredAt),
]);

export type InsertPrintJob = typeof printJobs.$inferInsert;
export type SelectPrintJob = typeof printJobs.$inferSelect;

// ─── Print Connector (PRINT-CONNECTOR-1) ─────────────────────────
export const printConnectorSelections = mysqlTable("print_connector_selections", {
	restaurantId: int().notNull(),
	printerId: varchar({ length: 128 }).notNull(),
	printerName: varchar({ length: 255 }).notNull(),
	platform: varchar({ length: 32 }).notNull(),
	transport: varchar({ length: 32 }).notNull(),
	selectedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.restaurantId] }),
]);

// ─── Restaurant Printers (PRINT-UX-1) ────────────────────────────
export const restaurantPrinters = mysqlTable("restaurant_printers", {
	id: int().autoincrement().notNull(),
	restaurantId: int().notNull(),
	printerId: varchar({ length: 128 }).notNull(),
	displayName: varchar({ length: 255 }).notNull(),
	platform: varchar({ length: 32 }).notNull(),
	transport: varchar({ length: 32 }).notNull(),
	isDefault: boolean().default(false).notNull(),
	isActive: boolean().default(true).notNull(),
	lastValidatedAt: timestamp({ mode: "string" }),
	capabilitiesJson: json(),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.id] }),
	uniqueIndex("restaurant_printers_unique").on(table.restaurantId, table.printerId),
	index("restaurant_printers_restaurant_default").on(table.restaurantId, table.isDefault),
]);

// ─── Connector enrollment (PRINT-CONNECTOR-PERSISTENCE-1) ─────────
export const connectorPairingTokens = mysqlTable("connector_pairing_tokens", {
	token: varchar({ length: 128 }).notNull(),
	restaurantId: int().notNull(),
	expiresAt: timestamp({ mode: "string" }).notNull(),
	consumedAt: timestamp({ mode: "string" }),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.token] }),
	index("connector_pairing_tokens_restaurant").on(table.restaurantId),
]);

export const connectorEnrollments = mysqlTable("connector_enrollments", {
	credentialId: varchar({ length: 128 }).notNull(),
	restaurantId: int().notNull(),
	connectorInstanceId: varchar({ length: 128 }).notNull(),
	secretHash: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(["active", "revoked"]).default("active").notNull(),
	connectorVersion: varchar({ length: 32 }),
	issuedAt: timestamp({ mode: "string" }).notNull(),
	expiresAt: timestamp({ mode: "string" }),
	revokedAt: timestamp({ mode: "string" }),
	lastSeenAt: timestamp({ mode: "string" }),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.credentialId] }),
	uniqueIndex("connector_enrollments_instance_unique").on(table.connectorInstanceId),
	index("connector_enrollments_restaurant_status").on(table.restaurantId, table.status),
]);

// ─── Connector release distribution (PRINT-RELEASE-DISTRIBUTION-1 / AUTOMATION-1) ─
export const connectorPublishedReleases = mysqlTable("connector_published_releases", {
	version: varchar({ length: 32 }).notNull(),
	productName: varchar({ length: 128 }).notNull(),
	installerFileName: varchar({ length: 255 }).notNull(),
	installerSha256: varchar({ length: 64 }).notNull(),
	storageKey: varchar({ length: 512 }).notNull(),
	releaseManifestJson: json().notNull(),
	status: mysqlEnum([
		"candidate",
		"published",
		"verified",
		"smoke_test_passed",
		"promoted",
		"active",
		"superseded",
	]).default("candidate").notNull(),
	publishedAt: timestamp({ mode: "string" }),
	verifiedAt: timestamp({ mode: "string" }),
	smokeTestPassedAt: timestamp({ mode: "string" }),
	promotedAt: timestamp({ mode: "string" }),
	activatedAt: timestamp({ mode: "string" }),
	gitTag: varchar({ length: 128 }),
	commitSha: varchar({ length: 64 }),
	workflowRunId: varchar({ length: 64 }),
	publisher: varchar({ length: 128 }),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.version] }),
	index("connector_published_releases_status").on(table.status),
]);

// ─── Order Domain Outbox (ORDER-EVENTS-1A) ───────────────────────
export const orderDomainOutbox = mysqlTable("order_domain_outbox", {
	id: varchar({ length: 36 }).notNull(),
	eventId: varchar({ length: 36 }).notNull(),
	eventType: varchar({ length: 64 }).notNull(),
	aggregateType: varchar({ length: 32 }).default("Order").notNull(),
	aggregateId: int().notNull(),
	aggregateVersion: int(),
	restaurantId: int().notNull(),
	sequenceNumber: int().notNull(),
	occurredAt: timestamp({ mode: "string" }).notNull(),
	correlationId: varchar({ length: 64 }),
	causationId: varchar({ length: 64 }),
	payloadVersion: int().default(1).notNull(),
	payload: text().notNull(),
	status: mysqlEnum(["pending", "published", "failed"]).default("pending").notNull(),
	publishAttempts: int().default(0).notNull(),
	lastError: text(),
	publishedAt: timestamp({ mode: "string" }),
	nextRetryAt: timestamp({ mode: "string" }),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.id] }),
	uniqueIndex("order_domain_outbox_event_id_unique").on(table.eventId),
	index("order_domain_outbox_status_retry").on(table.status, table.nextRetryAt),
	index("order_domain_outbox_aggregate_seq").on(table.aggregateId, table.sequenceNumber),
]);

export const orderDomainConsumerProcessed = mysqlTable("order_domain_consumer_processed", {
	consumerName: varchar({ length: 64 }).notNull(),
	eventId: varchar({ length: 36 }).notNull(),
	processedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.consumerName, table.eventId] }),
	index("order_domain_consumer_processed_event").on(table.eventId),
]);

// ─── Operational devices (DEVICE-MANAGEMENT-1) ────────────────────
export const operationalDeviceRoleEnum = mysqlEnum([
	"kitchen_display",
	"expo_display",
	"pickup_display",
	"customer_display",
	"print_monitor",
	"self_ordering_kiosk",
]);

export const operationalDevices = mysqlTable("operational_devices", {
	deviceId: varchar({ length: 64 }).notNull(),
	restaurantId: int().notNull(),
	branchId: int(),
	role: mysqlEnum([
		"kitchen_display",
		"expo_display",
		"pickup_display",
		"customer_display",
		"print_monitor",
		"self_ordering_kiosk",
	]).notNull(),
	displayName: varchar({ length: 128 }).notNull(),
	screenConfig: json(),
	status: mysqlEnum(["active", "disabled"]).default("active").notNull(),
	reportedVersion: varchar({ length: 64 }),
	lastSeenAt: timestamp({ mode: "string" }),
	screenConfigRevision: int().default(1).notNull(),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
},
(table) => [
	primaryKey({ columns: [table.deviceId] }),
	index("operational_devices_restaurant_status").on(table.restaurantId, table.status),
	index("operational_devices_restaurant_branch").on(table.restaurantId, table.branchId),
]);

export const operationalDeviceTokens = mysqlTable("operational_device_tokens", {
	tokenId: varchar({ length: 64 }).notNull(),
	deviceId: varchar({ length: 64 }).notNull(),
	secretHash: varchar({ length: 255 }).notNull(),
	secretCiphertext: varchar({ length: 512 }),
	status: mysqlEnum(["active", "revoked", "rotated"]).default("active").notNull(),
	issuedAt: timestamp({ mode: "string" }).notNull(),
	expiresAt: timestamp({ mode: "string" }),
	revokedAt: timestamp({ mode: "string" }),
	lastUsedAt: timestamp({ mode: "string" }),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	activationCodeHash: varchar({ length: 64 }),
	activationCodeExpiresAt: timestamp({ mode: "string" }),
},
(table) => [
	primaryKey({ columns: [table.tokenId] }),
	index("operational_device_tokens_device_status").on(table.deviceId, table.status),
	index("operational_device_tokens_activation_code_hash").on(table.activationCodeHash),
]);

export type InsertOrderDomainOutbox = typeof orderDomainOutbox.$inferInsert;
export type SelectOrderDomainOutbox = typeof orderDomainOutbox.$inferSelect;

export type InsertRestaurantTable = typeof restaurantTables.$inferInsert;
export type SelectRestaurantTable = typeof restaurantTables.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;

export type InsertCustomerPushSubscription = typeof customerPushSubscriptions.$inferInsert;
export type SelectCustomerPushSubscription = typeof customerPushSubscriptions.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type SelectOrderItem = typeof orderItems.$inferSelect;
