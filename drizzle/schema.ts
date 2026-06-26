import { mysqlTable, mysqlSchema, AnyMySqlColumn, bigint, int, tinyint, varchar, text, timestamp, decimal, mysqlEnum, index, uniqueIndex, boolean, json } from "drizzle-orm/mysql-core"
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
	/** THERMAL-PRINTING-12A — optional print station for category routing */
	stationId: int(),
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
	customerName: varchar({ length: 255 }),
	customerPhone: varchar({ length: 32 }),
	status: mysqlEnum(['pending','preparing','ready','served','cancelled']).default('pending').notNull(),
	notes: text(),
	totalAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	orderNumber: varchar({ length: 32 }).notNull(),
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

export type InsertRestaurantTable = typeof restaurantTables.$inferInsert;
export type SelectRestaurantTable = typeof restaurantTables.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;

export type InsertCustomerPushSubscription = typeof customerPushSubscriptions.$inferInsert;
export type SelectCustomerPushSubscription = typeof customerPushSubscriptions.$inferSelect;

export type InsertOrderItem = typeof orderItems.$inferInsert;
export type SelectOrderItem = typeof orderItems.$inferSelect;

// ─── Printers (THERMAL-PRINTING-3B.1) ─────────────────────────────
export const printers = mysqlTable(
	"printers",
	{
		id: int().autoincrement().notNull(),
		restaurantId: int().notNull(),
		name: varchar({ length: 128 }).notNull(),
		paperWidthMm: int().notNull(),
		profileId: varchar({ length: 64 }).notNull(),
		isDefault: boolean().default(false).notNull(),
		createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
		updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
	},
	(table) => [index("printers_restaurant_id").on(table.restaurantId)]
);

// ─── Print Stations (THERMAL-PRINTING-12A) ─────────────────────────
export const printStations = mysqlTable(
	"print_stations",
	{
		id: int().autoincrement().notNull(),
		restaurantId: int().notNull(),
		name: varchar({ length: 128 }).notNull(),
		printerId: int().notNull(),
		sortOrder: int().default(0).notNull(),
		createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
		updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
	},
	(table) => [
		index("print_stations_restaurant_id").on(table.restaurantId),
		index("print_stations_printer_id").on(table.printerId),
	]
);

// ─── Restaurant Print Settings (THERMAL-PRINTING-3B.1) ────────────
export const restaurantPrintSettings = mysqlTable("restaurant_print_settings", {
	restaurantId: int().notNull().primaryKey(),
	ticketLocale: mysqlEnum(["ar", "en", "bilingual"]).default("bilingual").notNull(),
	autoPrintOnNewOrder: boolean().default(true).notNull(),
	showTotalAmount: boolean().default(true).notNull(),
	defaultPrinterId: int(),
	createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
});

// ─── Print Jobs (THERMAL-PRINTING-3B.1) ───────────────────────────
export const printJobs = mysqlTable(
	"print_jobs",
	{
		id: int().autoincrement().notNull(),
		restaurantId: int().notNull(),
		orderId: int().notNull(),
		printerId: int(),
		/** THERMAL-PRINTING-12A — station that owns this job's item subset */
		stationId: int(),
		/** THERMAL-PRINTING-13I.3C.1 — agent assigned at dispatch */
		assignedAgentId: varchar({ length: 128 }),
		assignedAt: timestamp({ mode: "string" }),
		status: mysqlEnum([
			"queued",
			"assigned",
			"claimed",
			"printing",
			"printed",
			"failed",
			"cancelled",
			"expired",
		])
			.default("queued")
			.notNull(),
		attemptCount: int().default(0).notNull(),
		idempotencyKey: varchar({ length: 128 }).notNull(),
		claimedBy: int(),
		leaseExpiresAt: timestamp({ mode: "string" }),
		createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
		updatedAt: timestamp({ mode: "string" }).defaultNow().onUpdateNow().notNull(),
	},
	(table) => [
		index("print_jobs_restaurant_id").on(table.restaurantId),
		index("print_jobs_order_id").on(table.orderId),
		index("print_jobs_printer_id").on(table.printerId),
		index("print_jobs_station_id").on(table.stationId),
		index("print_jobs_status").on(table.status),
		uniqueIndex("print_jobs_idempotency_key_unique").on(table.idempotencyKey),
		index("print_jobs_restaurant_id_status_created_at").on(
			table.restaurantId,
			table.status,
			table.createdAt
		),
	]
);

// ─── Print Job Attempts (THERMAL-PRINTING-3B.1) ───────────────────
export const printJobAttempts = mysqlTable(
	"print_job_attempts",
	{
		id: int().autoincrement().notNull(),
		printJobId: int().notNull(),
		eventType: varchar({ length: 64 }).notNull(),
		metadataJson: json(),
		createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
	},
	(table) => [index("print_job_attempts_print_job_id").on(table.printJobId)]
);

// ─── Print Diagnostic Runs (THERMAL-PRINTING-13I.6) ───────────────
export const printDiagnosticRuns = mysqlTable(
	"print_diagnostic_runs",
	{
		id: int().autoincrement().notNull(),
		diagnosticId: varchar({ length: 64 }).notNull(),
		restaurantId: int().notNull(),
		printerId: int().notNull(),
		agentId: varchar({ length: 128 }),
		triggeredByUserId: int().notNull(),
		triggeredByLabel: varchar({ length: 256 }).notNull(),
		status: mysqlEnum(["pending", "accepted", "completed", "failed"])
			.default("pending")
			.notNull(),
		error: varchar({ length: 512 }),
		createdAt: timestamp({ mode: "string" }).default("CURRENT_TIMESTAMP").notNull(),
		completedAt: timestamp({ mode: "string" }),
	},
	(table) => [
		uniqueIndex("print_diagnostic_runs_diagnostic_id_unique").on(table.diagnosticId),
		index("print_diagnostic_runs_restaurant_id").on(table.restaurantId),
		index("print_diagnostic_runs_printer_id").on(table.printerId),
		index("print_diagnostic_runs_status_created_at").on(table.status, table.createdAt),
	]
);

export type InsertPrinter = typeof printers.$inferInsert;
export type SelectPrinter = typeof printers.$inferSelect;

export type InsertPrintStation = typeof printStations.$inferInsert;
export type SelectPrintStation = typeof printStations.$inferSelect;

export type InsertRestaurantPrintSettings = typeof restaurantPrintSettings.$inferInsert;
export type SelectRestaurantPrintSettings = typeof restaurantPrintSettings.$inferSelect;

export type InsertPrintJob = typeof printJobs.$inferInsert;
export type SelectPrintJob = typeof printJobs.$inferSelect;

export type InsertPrintJobAttempt = typeof printJobAttempts.$inferInsert;
export type SelectPrintJobAttempt = typeof printJobAttempts.$inferSelect;

export type InsertPrintDiagnosticRun = typeof printDiagnosticRuns.$inferInsert;
export type SelectPrintDiagnosticRun = typeof printDiagnosticRuns.$inferSelect;
