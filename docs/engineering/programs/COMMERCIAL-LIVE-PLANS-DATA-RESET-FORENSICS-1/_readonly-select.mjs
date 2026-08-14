/**
 * COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1
 * SELECT / information_schema only. No INSERT, UPDATE, DELETE, DDL, or migrations.
 */
import "dotenv/config";
import { createConnection } from "mysql2/promise";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  const sslRaw = url.searchParams.get("ssl");
  let ssl;
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw);
    } catch {
      ssl = undefined;
    }
  }
  const host = url.hostname;
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl:
      ssl ??
      (isTidbCloud
        ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
        : undefined),
  };
}

function redactEmail(email) {
  if (!email) return null;
  const [local, domain] = String(email).split("@");
  if (!domain) return `${String(email).slice(0, 2)}…`;
  return `${local.slice(0, 2)}…@${domain}`;
}

function prefix(value, n = 8) {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

function asPlain(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "bigint") out[k] = Number(v);
    else if (Buffer.isBuffer(v)) out[k] = v.toString("utf8");
    else if (v instanceof Date) out[k] = v.toISOString();
    else out[k] = v;
  }
  return out;
}

const CANDIDATE_TABLES = [
  "commercial_plans",
  "commercial_plan_versions",
  "commercial_snapshot_definitions",
  "commercial_snapshots",
  "commercial_publications",
  "commercial_retirements",
  "commercial_bindings",
  "commercial_prices",
  "commercial_billing_cycles",
  "commercial_capability_mappings",
  "commercial_feature_bundles",
  "commercial_bundle_features",
  "commercial_plan_limits",
  "commercial_limit_profiles",
  "commercial_limit_values",
  "commercial_trial_policies",
  "commercial_migration_policies",
  "commercial_retirement_policies",
  "commercial_regions",
  "commercial_promotions",
  "commercial_publication_rules",
  "commercial_subscription_bindings",
  "subscription_plans",
  "user_subscriptions",
  "invoices",
  "renewal_notifications",
  "settlement_records",
  "users",
  "restaurants",
  "orders",
];

async function q(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return Array.isArray(rows) ? rows.map(asPlain) : rows;
}

async function tableExists(conn, name) {
  const rows = await q(
    conn,
    `SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME, TABLE_COMMENT
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [name]
  );
  return rows[0] ?? null;
}

async function columnsOf(conn, name) {
  return q(
    conn,
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [name]
  );
}

async function indexesOf(conn, name) {
  return q(
    conn,
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [name]
  );
}

async function countAndRange(conn, name) {
  const exists = await tableExists(conn, name);
  if (!exists) return { exists: false, count: 0 };
  const cols = await columnsOf(conn, name);
  const colNames = cols.map((c) => c.COLUMN_NAME);
  const ts = ["createdAt", "created_at", "issuedAt", "occurredAt"].find((c) =>
    colNames.includes(c)
  );
  const countRows = await q(conn, `SELECT COUNT(*) AS n FROM \`${name}\``);
  const count = Number(countRows[0]?.n ?? 0);
  let oldest = null;
  let newest = null;
  if (ts && count > 0) {
    const range = await q(
      conn,
      `SELECT MIN(\`${ts}\`) AS oldest, MAX(\`${ts}\`) AS newest FROM \`${name}\``
    );
    oldest = range[0]?.oldest ?? null;
    newest = range[0]?.newest ?? null;
  }
  return {
    exists: true,
    count,
    oldest,
    newest,
    timeColumn: ts ?? null,
    columns: colNames,
    engineMeta: exists,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const ownerOpenId = (process.env.OWNER_OPEN_ID ?? "").trim();
  const cfg = parseDatabaseUrl(databaseUrl);
  const conn = await createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(cfg.ssl ? { ssl: cfg.ssl } : {}),
  });

  const report = {
    queriedAt: new Date().toISOString(),
    database: cfg.database,
    hostKind: /\.tidbcloud\.com$/i.test(cfg.host) ? "tidb_cloud" : "other",
    statements: "SELECT_AND_INFORMATION_SCHEMA_ONLY",
    ownerOpenIdConfigured: Boolean(ownerOpenId),
  };

  try {
    const dbName = await q(conn, "SELECT DATABASE() AS db");
    report.databaseConfirmed = dbName[0]?.db;

    const allTables = await q(
      conn,
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND (
           TABLE_NAME LIKE 'commercial%'
           OR TABLE_NAME LIKE '%subscription%'
           OR TABLE_NAME LIKE '%invoice%'
           OR TABLE_NAME LIKE '%billing%'
           OR TABLE_NAME LIKE '%payment%'
           OR TABLE_NAME LIKE '%snapshot%'
           OR TABLE_NAME LIKE '%plan%'
         )
       ORDER BY TABLE_NAME`
    );
    report.discoveredRelatedTables = allTables.map((r) => r.TABLE_NAME);

    report.inventory = {};
    for (const name of new Set([
      ...CANDIDATE_TABLES,
      ...report.discoveredRelatedTables,
    ])) {
      report.inventory[name] = await countAndRange(conn, name);
    }

    const lastMigrations = await q(
      conn,
      `SELECT id, hash, created_at FROM __drizzle_migrations ORDER BY id DESC LIMIT 12`
    );
    report.migrationsRecent = lastMigrations.map((r) => ({
      id: r.id,
      hashPrefix: prefix(r.hash, 12),
      created_at: r.created_at,
    }));
    const hash0084 =
      "9d585e21e43fbd152a4a810e84331866a02bdfbab8a02bc7616c0d5ee4383e28";
    const hash0085 =
      "c104e894606f292173e9f133f575980441d77bc9a650d1251760e988c102c81a";
    const applied = await q(
      conn,
      `SELECT id, hash, created_at FROM __drizzle_migrations WHERE hash IN (?, ?)`,
      [hash0084, hash0085]
    );
    report.migration0084_0085 = applied.map((r) => ({
      id: r.id,
      hashPrefix: prefix(r.hash, 12),
      created_at: r.created_at,
    }));
    const allHashes = await q(
      conn,
      `SELECT COUNT(*) AS n FROM __drizzle_migrations`
    );
    report.migrationRowCount = Number(allHashes[0]?.n ?? 0);

    const schemaFlags = {};
    for (const [table, cols] of [
      ["commercial_plans", ["featureBundleId", "limitProfileId", "trialPolicyId"]],
      ["commercial_prices", ["planId", "planVersionId"]],
      [
        "commercial_subscription_bindings",
        ["planId", "planVersionId", "snapshotId", "chargedAmount"],
      ],
      ["commercial_promotions", ["eligiblePlanIds", "eligiblePlanVersionIds"]],
    ]) {
      if (!report.inventory[table]?.exists) continue;
      const present = new Set(report.inventory[table].columns);
      schemaFlags[table] = Object.fromEntries(cols.map((c) => [c, present.has(c)]));
    }
    report.schemaFlags = schemaFlags;
    report.livePlanColumnsPresent = Boolean(
      schemaFlags.commercial_plans?.featureBundleId
    );

    if (report.inventory.commercial_plans?.exists) {
      report.plans = await q(
        conn,
        `SELECT id, code, name, description, sortOrder, isHidden, createdAt, updatedAt
         FROM commercial_plans ORDER BY sortOrder, code`
      );
    }

    if (report.inventory.commercial_plan_versions?.exists) {
      report.planVersions = await q(
        conn,
        `SELECT v.id, v.planId, p.code AS planCode, v.versionCode, v.versionName, v.state,
                v.featureBundleId, v.limitProfileId, v.trialPolicyId,
                v.publishedAt, v.deprecatedAt, v.retiredAt, v.createdAt, v.updatedAt
         FROM commercial_plan_versions v
         LEFT JOIN commercial_plans p ON p.id = v.planId
         ORDER BY p.code, v.createdAt`
      );
      report.planVersionStateCounts = await q(
        conn,
        `SELECT state, COUNT(*) AS n FROM commercial_plan_versions GROUP BY state`
      );
    }

    if (report.inventory.commercial_snapshot_definitions?.exists) {
      report.snapshots = await q(
        conn,
        `SELECT s.id, s.planVersionId, s.schemaVersion, s.effectiveDate, s.createdAt,
                JSON_TYPE(s.payload) AS payloadType,
                JSON_UNQUOTE(JSON_EXTRACT(s.payload, '$.pricing.amount')) AS payloadAmount,
                JSON_UNQUOTE(JSON_EXTRACT(s.payload, '$.pricing.currency')) AS payloadCurrency,
                JSON_UNQUOTE(JSON_EXTRACT(s.payload, '$.pricing.billingCycleId')) AS payloadCycleId,
                JSON_UNQUOTE(JSON_EXTRACT(s.payload, '$.pricing.billingCycleCode')) AS payloadCycleCode,
                JSON_LENGTH(s.payload) AS payloadKeys
         FROM commercial_snapshot_definitions s
         ORDER BY s.createdAt`
      );
    }

    if (report.inventory.commercial_prices?.exists) {
      const priceCols = report.inventory.commercial_prices.columns;
      const versionJoin = priceCols.includes("planVersionId");
      report.prices = versionJoin
        ? await q(
            conn,
            `SELECT pr.id, pr.planVersionId, v.planId, p.code AS planCode, v.state AS versionState,
                    pr.billingCycleId, c.code AS cycleCode, pr.currency, pr.amount, pr.regionId,
                    pr.createdAt
             FROM commercial_prices pr
             LEFT JOIN commercial_plan_versions v ON v.id = pr.planVersionId
             LEFT JOIN commercial_plans p ON p.id = v.planId
             LEFT JOIN commercial_billing_cycles c ON c.id = pr.billingCycleId
             ORDER BY p.code, pr.currency, pr.amount`
          )
        : await q(
            conn,
            `SELECT pr.id, pr.planId, p.code AS planCode, pr.billingCycleId, pr.currency, pr.amount, pr.regionId, pr.createdAt
             FROM commercial_prices pr
             LEFT JOIN commercial_plans p ON p.id = pr.planId
             ORDER BY p.code, pr.currency, pr.amount`
          );
    }

    if (report.inventory.commercial_billing_cycles?.exists) {
      report.billingCycles = await q(
        conn,
        `SELECT id, code, name, intervalCount, intervalUnit, createdAt FROM commercial_billing_cycles`
      );
    }
    if (report.inventory.commercial_feature_bundles?.exists) {
      report.featureBundles = await q(
        conn,
        `SELECT id, code, name, createdAt FROM commercial_feature_bundles`
      );
    }
    if (report.inventory.commercial_bundle_features?.exists) {
      report.bundleFeatureCounts = await q(
        conn,
        `SELECT b.code AS bundleCode, COUNT(*) AS n, SUM(f.included) AS included
         FROM commercial_bundle_features f
         JOIN commercial_feature_bundles b ON b.id = f.bundleId
         GROUP BY b.code`
      );
    }
    if (report.inventory.commercial_limit_profiles?.exists) {
      report.limitProfiles = await q(
        conn,
        `SELECT id, code, name, createdAt FROM commercial_limit_profiles`
      );
    }
    if (report.inventory.commercial_limit_values?.exists) {
      report.limitValueCounts = await q(
        conn,
        `SELECT p.code AS profileCode, COUNT(*) AS n
         FROM commercial_limit_values v
         JOIN commercial_limit_profiles p ON p.id = v.profileId
         GROUP BY p.code`
      );
    }
    for (const t of [
      "commercial_trial_policies",
      "commercial_migration_policies",
      "commercial_retirement_policies",
      "commercial_regions",
      "commercial_promotions",
      "commercial_publication_rules",
    ]) {
      if (report.inventory[t]?.exists && report.inventory[t].count > 0) {
        report[t] = await q(conn, `SELECT * FROM \`${t}\``);
      } else if (report.inventory[t]?.exists) {
        report[t] = [];
      }
    }

    if (report.inventory.subscription_plans?.exists) {
      report.legacyPlans = await q(
        conn,
        `SELECT id, nameEn, nameAr, priceMonthly, priceYearly, isActive, sortOrder,
                maxRestaurants, maxItemsPerRestaurant, maxCategories, createdAt
         FROM subscription_plans ORDER BY id`
      );
    }

    if (report.inventory.users?.exists) {
      const users = await q(
        conn,
        `SELECT id, openId, name, email, role, accountClassification, loginMethod,
                createdAt, lastSignedIn
         FROM users ORDER BY id`
      );
      report.users = users.map((u) => ({
        id: u.id,
        openIdPrefix: prefix(u.openId, 8),
        isOwner: ownerOpenId ? u.openId === ownerOpenId : false,
        name: u.name,
        emailRedacted: redactEmail(u.email),
        role: u.role,
        accountClassification: u.accountClassification,
        loginMethod: u.loginMethod,
        createdAt: u.createdAt,
        lastSignedIn: u.lastSignedIn,
      }));
      report.userClassificationCounts = await q(
        conn,
        `SELECT accountClassification, role, COUNT(*) AS n FROM users GROUP BY accountClassification, role`
      );
    }

    if (report.inventory.restaurants?.exists) {
      report.restaurants = await q(
        conn,
        `SELECT r.id, r.userId, r.nameAr, r.nameEn, r.slug, r.isActive, r.createdAt,
                (SELECT COUNT(*) FROM orders o WHERE o.restaurantId = r.id) AS orderCount
         FROM restaurants r ORDER BY r.id`
      );
    }

    if (report.inventory.user_subscriptions?.exists) {
      report.subscriptions = await q(
        conn,
        `SELECT s.id, s.userId, s.restaurantId, s.planId, s.status, s.billingCycle,
                (s.stripeSubscriptionId IS NOT NULL AND s.stripeSubscriptionId <> '') AS hasStripeSub,
                (s.stripeCustomerId IS NOT NULL AND s.stripeCustomerId <> '') AS hasStripeCustomer,
                LEFT(IFNULL(s.stripeSubscriptionId,''), 8) AS stripeSubPrefix,
                LEFT(IFNULL(s.stripeCustomerId,''), 8) AS stripeCustPrefix,
                s.currentPeriodStart, s.currentPeriodEnd, s.trialEndsAt, s.canceledAt,
                s.createdAt, s.updatedAt
         FROM user_subscriptions s ORDER BY s.id`
      );
      report.subscriptionStatusCounts = await q(
        conn,
        `SELECT status, COUNT(*) AS n FROM user_subscriptions GROUP BY status`
      );
      report.subscriptionScopeCounts = await q(
        conn,
        `SELECT
            SUM(restaurantId = 0) AS accountLevel,
            SUM(restaurantId <> 0) AS restaurantLevel
         FROM user_subscriptions`
      );
    }

    if (report.inventory.commercial_subscription_bindings?.exists) {
      const bCols = report.inventory.commercial_subscription_bindings.columns;
      const selectCols = ["b.id", "b.subscriptionId", "b.legacyPlanId", "b.createdAt"];
      if (bCols.includes("planVersionId")) selectCols.push("b.planVersionId");
      if (bCols.includes("snapshotId")) selectCols.push("b.snapshotId");
      if (bCols.includes("planId")) selectCols.push("b.planId");
      if (bCols.includes("chargedAmount")) selectCols.push("b.chargedAmount");
      report.bindings = await q(
        conn,
        `SELECT ${selectCols.join(", ")},
                s.userId, s.restaurantId, s.status AS subStatus, s.planId AS legacyPlanIdOnSub
         FROM commercial_subscription_bindings b
         LEFT JOIN user_subscriptions s ON s.id = b.subscriptionId
         ORDER BY b.createdAt`
      );
      if (bCols.includes("planVersionId")) {
        report.bindingJoinability = await q(
          conn,
          `SELECT
              COUNT(*) AS total,
              SUM(v.id IS NOT NULL) AS joinsVersion,
              SUM(v.id IS NULL) AS unmatchedVersion,
              SUM(p.id IS NOT NULL) AS joinsPlan,
              SUM(snap.id IS NOT NULL) AS joinsSnapshot
           FROM commercial_subscription_bindings b
           LEFT JOIN commercial_plan_versions v ON v.id = b.planVersionId
           LEFT JOIN commercial_plans p ON p.id = v.planId
           LEFT JOIN commercial_snapshot_definitions snap ON snap.id = b.snapshotId`
        );
      }
    }

    if (report.inventory.invoices?.exists) {
      report.invoices = await q(
        conn,
        `SELECT i.id, i.userId, i.subscriptionId, i.amount, i.currency, i.status,
                i.invoiceNumber, i.issuedAt, i.dueAt, i.paidAt, i.createdAt,
                (i.pdfUrl IS NOT NULL AND i.pdfUrl <> '') AS hasPdf
         FROM invoices i ORDER BY i.id`
      );
      report.invoiceStatusCounts = await q(
        conn,
        `SELECT status, currency, COUNT(*) AS n, SUM(amount) AS sumAmount
         FROM invoices GROUP BY status, currency`
      );
    }

    if (report.inventory.renewal_notifications?.exists) {
      report.renewalNotificationCounts = await q(
        conn,
        `SELECT notificationType, COUNT(*) AS n FROM renewal_notifications GROUP BY notificationType`
      );
    }

    const platformCounts = {};
    for (const t of [
      "orders",
      "settlement_records",
      "check_settlement_transactions",
    ]) {
      const meta = await tableExists(conn, t);
      if (meta) {
        const n = await q(conn, `SELECT COUNT(*) AS n FROM \`${t}\``);
        platformCounts[t] = Number(n[0]?.n ?? 0);
      }
    }
    report.platformOperationalCounts = platformCounts;

    if (report.inventory.commercial_plan_versions?.exists && report.plans) {
      report.planRollup = await q(
        conn,
        `SELECT
            p.id, p.code, p.name, p.isHidden,
            (SELECT COUNT(*) FROM commercial_plan_versions v WHERE v.planId = p.id) AS versionCount,
            (SELECT COUNT(*) FROM commercial_plan_versions v WHERE v.planId = p.id AND v.state = 'published') AS publishedCount,
            (SELECT COUNT(*) FROM commercial_snapshot_definitions s
               JOIN commercial_plan_versions v ON v.id = s.planVersionId
               WHERE v.planId = p.id) AS snapshotCount,
            (SELECT COUNT(*) FROM commercial_prices pr
               JOIN commercial_plan_versions v ON v.id = pr.planVersionId
               WHERE v.planId = p.id) AS priceCount,
            (SELECT COUNT(*) FROM commercial_bundle_features f
               JOIN commercial_plan_versions v ON v.featureBundleId = f.bundleId
               WHERE v.planId = p.id AND v.state = 'published' AND f.included = 1) AS includedCapabilityCount
         FROM commercial_plans p
         ORDER BY p.sortOrder, p.code`
      );
    }

    if (
      report.inventory.commercial_subscription_bindings?.exists &&
      report.inventory.user_subscriptions?.exists &&
      report.inventory.commercial_subscription_bindings.columns.includes(
        "planVersionId"
      )
    ) {
      report.subscribersByPlan = await q(
        conn,
        `SELECT p.code, COUNT(DISTINCT s.id) AS subscriberCount,
                SUM(s.status = 'active') AS activeCount,
                SUM(s.status = 'trial') AS trialCount,
                SUM(s.status = 'expired') AS expiredCount,
                SUM(s.status = 'canceled') AS canceledCount
         FROM commercial_plans p
         LEFT JOIN commercial_plan_versions v ON v.planId = p.id
         LEFT JOIN commercial_subscription_bindings b ON b.planVersionId = v.id
         LEFT JOIN user_subscriptions s ON s.id = b.subscriptionId
         GROUP BY p.id, p.code
         ORDER BY p.code`
      );
    }

    report.indexes = {};
    for (const t of [
      "commercial_plans",
      "commercial_plan_versions",
      "commercial_prices",
      "commercial_subscription_bindings",
      "commercial_snapshot_definitions",
    ]) {
      if (report.inventory[t]?.exists) {
        report.indexes[t] = await indexesOf(conn, t);
      }
    }
  } finally {
    await conn.end();
  }

  const outPath = join(HERE, "_QUERY-EVIDENCE.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        queriedAt: report.queriedAt,
        database: report.databaseConfirmed,
        hostKind: report.hostKind,
        ownerOpenIdConfigured: report.ownerOpenIdConfigured,
        livePlanColumnsPresent: report.livePlanColumnsPresent,
        schemaFlags: report.schemaFlags,
        tableExists: Object.fromEntries(
          Object.entries(report.inventory).map(([k, v]) => [
            k,
            v.exists ? v.count : "ABSENT",
          ])
        ),
        users: report.users,
        subscriptionStatusCounts: report.subscriptionStatusCounts,
        invoiceStatusCounts: report.invoiceStatusCounts,
        plans: report.plans?.map((p) => ({ id: p.id, code: p.code, name: p.name })),
        planVersionStateCounts: report.planVersionStateCounts,
        bindingCount: report.bindings?.length ?? 0,
        outPath,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FORENSICS_FAILED", err?.message || err);
  process.exit(1);
});
