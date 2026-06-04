/**
 * DATA-INTEGRITY Phase 2 — read-only live audit.
 * Usage:
 *   AUDIT_TARGET=production DATABASE_URL='...' node scripts/data-integrity-audit-phase2-readonly.mjs
 *   AUDIT_TARGET=staging DATABASE_URL='...' node scripts/data-integrity-audit-phase2-readonly.mjs
 */
import mysql from "mysql2/promise";

const SAMPLE_LIMIT = 15;
const target = process.env.AUDIT_TARGET || "unknown";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

async function q(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function count(conn, sql) {
  const [row] = await q(conn, sql);
  return Number(row.c ?? row.C ?? Object.values(row)[0] ?? 0);
}

function dbNameFromUrl(connectionUrl) {
  try {
    const u = new URL(connectionUrl.replace(/^mysql:\/\//, "http://"));
    return u.pathname.replace(/^\//, "") || "unknown";
  } catch {
    return "unknown";
  }
}

const CHECKS = [
  {
    id: "S4",
    category: "subscription",
    severity: "critical",
    title: "Orphan subscriptions (missing user or restaurant)",
    countSql: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      LEFT JOIN users u ON u.id = s.userId
      LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
      WHERE u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)`,
    sampleSql: `
      SELECT s.id, s.userId, s.restaurantId, s.status, s.planId
      FROM user_subscriptions s
      LEFT JOIN users u ON u.id = s.userId
      LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
      WHERE u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)
      ORDER BY s.id LIMIT ${SAMPLE_LIMIT}`,
    impact:
      "Subscription rows detached from owners or venues; billing and ordering resolution may fail.",
    cleanup:
      "Delete orphan subscription rows after confirming no payment history, or re-link to valid user/restaurant.",
  },
  {
    id: "S5",
    category: "subscription",
    severity: "high",
    title: "Subscriptions with invalid planId",
    countSql: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      LEFT JOIN subscription_plans p ON p.id = s.planId
      WHERE p.id IS NULL`,
    sampleSql: `
      SELECT s.id, s.userId, s.restaurantId, s.planId, s.status
      FROM user_subscriptions s
      LEFT JOIN subscription_plans p ON p.id = s.planId
      WHERE p.id IS NULL ORDER BY s.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Plan features and pricing undefined; admin and ordering checks may deny access.",
    cleanup: "Update planId to valid plan or delete orphan subscription rows.",
  },
  {
    id: "S6",
    category: "subscription",
    severity: "high",
    title: "Duplicate active/trial per (userId, restaurantId)",
    countSql: `
      SELECT COUNT(*) AS c FROM (
        SELECT userId, restaurantId FROM user_subscriptions
        WHERE status IN ('active','trial')
        GROUP BY userId, restaurantId HAVING COUNT(*) > 1
      ) d`,
    sampleSql: `
      SELECT userId, restaurantId, COUNT(*) AS cnt,
             GROUP_CONCAT(id ORDER BY id) AS sub_ids
      FROM user_subscriptions
      WHERE status IN ('active','trial')
      GROUP BY userId, restaurantId HAVING COUNT(*) > 1
      LIMIT ${SAMPLE_LIMIT}`,
    impact:
      "Canonical resolver must pick one row; historical bulk updates may have affected wrong row pre-LH-1B-4.",
    cleanup:
      "Merge or cancel duplicate rows; keep one entitled row per (userId, restaurantId); add unique index in later migration.",
  },
  {
    id: "S7a",
    category: "subscription",
    severity: "high",
    title: "Expired active subscriptions (period end in past)",
    countSql: `
      SELECT COUNT(*) AS c FROM user_subscriptions
      WHERE status = 'active' AND currentPeriodEnd < UTC_TIMESTAMP()`,
    sampleSql: `
      SELECT id, userId, restaurantId, currentPeriodEnd, planId
      FROM user_subscriptions
      WHERE status = 'active' AND currentPeriodEnd < UTC_TIMESTAMP()
      ORDER BY id LIMIT ${SAMPLE_LIMIT}`,
    impact:
      "Post-LH-1B-3 entitlement denies features; row still shows active in DB and admin stats.",
    cleanup: "Set status to expired or extend period after payment verification.",
  },
  {
    id: "S7b",
    category: "subscription",
    severity: "high",
    title: "Expired or missing trial end",
    countSql: `
      SELECT COUNT(*) AS c FROM user_subscriptions
      WHERE status = 'trial'
        AND (trialEndsAt IS NULL OR trialEndsAt < UTC_TIMESTAMP())`,
    sampleSql: `
      SELECT id, userId, restaurantId, trialEndsAt, currentPeriodEnd
      FROM user_subscriptions
      WHERE status = 'trial'
        AND (trialEndsAt IS NULL OR trialEndsAt < UTC_TIMESTAMP())
      ORDER BY id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Trial features blocked by entitlement layer while status remains trial.",
    cleanup: "Expire trial rows or set valid trialEndsAt.",
  },
  {
    id: "S9",
    category: "subscription",
    severity: "high",
    title: "Subscription userId ≠ restaurant owner",
    countSql: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      JOIN restaurants r ON r.id = s.restaurantId
      WHERE s.restaurantId != 0 AND s.userId != r.userId`,
    sampleSql: `
      SELECT s.id, s.userId, s.restaurantId, r.userId AS owner_user_id
      FROM user_subscriptions s
      JOIN restaurants r ON r.id = s.restaurantId
      WHERE s.restaurantId != 0 AND s.userId != r.userId
      ORDER BY s.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Wrong owner billed or entitled for a venue.",
    cleanup: "Correct userId to restaurant owner or move subscription to correct restaurantId.",
  },
  {
    id: "S10",
    category: "subscription",
    severity: "critical",
    title: "Orphan invoices (user or subscription missing)",
    countSql: `
      SELECT COUNT(*) AS c FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE u.id IS NULL OR s.id IS NULL`,
    sampleSql: `
      SELECT i.id, i.userId, i.subscriptionId, i.invoiceNumber
      FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE u.id IS NULL OR s.id IS NULL
      ORDER BY i.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Billing artifacts reference deleted entities; PDF and admin views may break.",
    cleanup: "Delete orphan invoices or restore parent user/subscription.",
  },
  {
    id: "R1",
    category: "restaurant",
    severity: "critical",
    title: "Restaurants without owner user",
    countSql: `
      SELECT COUNT(*) AS c FROM restaurants r
      LEFT JOIN users u ON u.id = r.userId WHERE u.id IS NULL`,
    sampleSql: `
      SELECT r.id, r.userId, r.slug, r.nameAr FROM restaurants r
      LEFT JOIN users u ON u.id = r.userId WHERE u.id IS NULL
      ORDER BY r.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Orphan venues cannot authenticate or manage menus.",
    cleanup: "Delete restaurant cascade or assign valid userId.",
  },
  {
    id: "R3",
    category: "restaurant",
    severity: "high",
    title: "Duplicate restaurant slugs",
    countSql: `
      SELECT COUNT(*) AS c FROM (
        SELECT slug FROM restaurants GROUP BY slug HAVING COUNT(*) > 1
      ) d`,
    sampleSql: `
      SELECT slug, COUNT(*) AS c, GROUP_CONCAT(id ORDER BY id) AS ids
      FROM restaurants GROUP BY slug HAVING COUNT(*) > 1
      LIMIT ${SAMPLE_LIMIT}`,
    impact: "Public menu URLs may resolve to wrong restaurant.",
    cleanup: "Rename duplicate slugs; enforce unique constraint if missing.",
  },
  {
    id: "R2",
    category: "restaurant",
    severity: "medium",
    title: "Restaurants with no subscription row for owner",
    countSql: `
      SELECT COUNT(*) AS c FROM restaurants r
      WHERE NOT EXISTS (
        SELECT 1 FROM user_subscriptions s
        WHERE s.userId = r.userId
          AND (s.restaurantId = r.id OR s.restaurantId = 0)
      )`,
    sampleSql: `
      SELECT r.id, r.userId, r.slug FROM restaurants r
      WHERE NOT EXISTS (
        SELECT 1 FROM user_subscriptions s
        WHERE s.userId = r.userId
          AND (s.restaurantId = r.id OR s.restaurantId = 0)
      )
      ORDER BY r.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Venue may lack trial/paid access; ordering and premium features blocked.",
    cleanup: "Create scoped or user-level trial subscription for owner.",
  },
  {
    id: "O1",
    category: "order",
    severity: "critical",
    title: "Orders without restaurant",
    countSql: `
      SELECT COUNT(*) AS c FROM orders o
      LEFT JOIN restaurants r ON r.id = o.restaurantId WHERE r.id IS NULL`,
    sampleSql: `
      SELECT o.id, o.restaurantId, o.orderNumber FROM orders o
      LEFT JOIN restaurants r ON r.id = o.restaurantId WHERE r.id IS NULL
      ORDER BY o.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Orphan orders invisible in restaurant dashboards.",
    cleanup: "Delete orphan orders and order_items.",
  },
  {
    id: "O2",
    category: "order",
    severity: "high",
    title: "Orders with missing/invalid table linkage",
    countSql: `
      SELECT COUNT(*) AS c FROM orders o
      LEFT JOIN restaurant_tables t
        ON t.id = o.tableId AND t.restaurantId = o.restaurantId
      WHERE t.id IS NULL`,
    sampleSql: `
      SELECT o.id, o.restaurantId, o.tableId, o.tableNumber
      FROM orders o
      LEFT JOIN restaurant_tables t
        ON t.id = o.tableId AND t.restaurantId = o.restaurantId
      WHERE t.id IS NULL ORDER BY o.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Table QR flow inconsistent; kitchen display may show wrong table.",
    cleanup: "Fix tableId or delete invalid orders.",
  },
  {
    id: "O3",
    category: "order",
    severity: "critical",
    title: "Order items orphan (order or menu item missing)",
    countSql: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      WHERE o.id IS NULL OR m.id IS NULL`,
    sampleSql: `
      SELECT oi.id, oi.orderId, oi.menuItemId
      FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      WHERE o.id IS NULL OR m.id IS NULL
      ORDER BY oi.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Order totals and line items inconsistent.",
    cleanup: "Delete orphan order_items or restore parent order/menu item.",
  },
  {
    id: "O4",
    category: "order",
    severity: "high",
    title: "Order totalAmount mismatch vs line items",
    countSql: `
      SELECT COUNT(*) AS c FROM (
        SELECT o.id FROM orders o
        JOIN order_items oi ON oi.orderId = o.id
        GROUP BY o.id, o.totalAmount
        HAVING ABS(CAST(o.totalAmount AS DECIMAL(10,2)) - SUM(oi.price * oi.quantity)) > 0.01
      ) x`,
    sampleSql: `
      SELECT o.id, o.orderNumber, o.totalAmount,
             ROUND(SUM(oi.price * oi.quantity), 2) AS computed_total
      FROM orders o
      JOIN order_items oi ON oi.orderId = o.id
      GROUP BY o.id, o.orderNumber, o.totalAmount
      HAVING ABS(CAST(o.totalAmount AS DECIMAL(10,2)) - SUM(oi.price * oi.quantity)) > 0.01
      LIMIT ${SAMPLE_LIMIT}`,
    impact: "Financial and ops reports wrong; possible pre-LH-1A client-priced orders.",
    cleanup: "Recalculate totalAmount from order_items for affected orders.",
  },
  {
    id: "M1",
    category: "menu",
    severity: "high",
    title: "Categories without restaurant",
    countSql: `
      SELECT COUNT(*) AS c FROM categories c
      LEFT JOIN restaurants r ON r.id = c.restaurantId WHERE r.id IS NULL`,
    sampleSql: `
      SELECT c.id, c.restaurantId, c.nameAr FROM categories c
      LEFT JOIN restaurants r ON r.id = c.restaurantId WHERE r.id IS NULL
      ORDER BY c.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Menu structure broken for public pages.",
    cleanup: "Delete orphan categories and dependent items.",
  },
  {
    id: "M2",
    category: "menu",
    severity: "high",
    title: "Menu items without restaurant or category",
    countSql: `
      SELECT COUNT(*) AS c FROM menu_items m
      LEFT JOIN restaurants r ON r.id = m.restaurantId
      LEFT JOIN categories c ON c.id = m.categoryId
      WHERE r.id IS NULL OR c.id IS NULL`,
    sampleSql: `
      SELECT m.id, m.restaurantId, m.categoryId FROM menu_items m
      LEFT JOIN restaurants r ON r.id = m.restaurantId
      LEFT JOIN categories c ON c.id = m.categoryId
      WHERE r.id IS NULL OR c.id IS NULL
      ORDER BY m.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Ordering and menu display fail for affected items.",
    cleanup: "Delete orphan menu items or restore parents.",
  },
  {
    id: "M3",
    category: "menu",
    severity: "high",
    title: "Menu item restaurantId ≠ category restaurantId",
    countSql: `
      SELECT COUNT(*) AS c FROM menu_items m
      JOIN categories c ON c.id = m.categoryId
      WHERE m.restaurantId != c.restaurantId`,
    sampleSql: `
      SELECT m.id, m.restaurantId, m.categoryId, c.restaurantId AS cat_restaurant
      FROM menu_items m
      JOIN categories c ON c.id = m.categoryId
      WHERE m.restaurantId != c.restaurantId
      ORDER BY m.id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Cross-venue menu leakage or order validation errors.",
    cleanup: "Align restaurantId on item or move to correct category.",
  },
  {
    id: "U1",
    category: "user",
    severity: "critical",
    title: "Duplicate normalized emails",
    countSql: `
      SELECT COUNT(*) AS c FROM (
        SELECT TRIM(LOWER(email)) AS e FROM users
        WHERE email IS NOT NULL AND TRIM(email) <> ''
        GROUP BY TRIM(LOWER(email)) HAVING COUNT(*) > 1
      ) d`,
    sampleSql: `
      SELECT TRIM(LOWER(email)) AS norm, COUNT(*) AS c,
             GROUP_CONCAT(id ORDER BY id) AS user_ids
      FROM users
      WHERE email IS NOT NULL AND TRIM(email) <> ''
      GROUP BY TRIM(LOWER(email)) HAVING COUNT(*) > 1
      LIMIT ${SAMPLE_LIMIT}`,
    impact: "Migration 0019 unique email may fail; auth identity confusion.",
    cleanup: "Merge or reassign duplicate accounts before unique index enforcement.",
  },
  {
    id: "U4",
    category: "user",
    severity: "critical",
    title: "Duplicate openId",
    countSql: `
      SELECT COUNT(*) AS c FROM (
        SELECT openId FROM users GROUP BY openId HAVING COUNT(*) > 1
      ) d`,
    sampleSql: `
      SELECT openId, COUNT(*) AS c, GROUP_CONCAT(id ORDER BY id) AS user_ids
      FROM users GROUP BY openId HAVING COUNT(*) > 1
      LIMIT ${SAMPLE_LIMIT}`,
    impact: "OAuth/session may attach to wrong user.",
    cleanup: "Deduplicate users and fix openId values.",
  },
  {
    id: "U3",
    category: "user",
    severity: "medium",
    title: "Legacy Manus login artifacts",
    countSql: `
      SELECT COUNT(*) AS c FROM users
      WHERE loginMethod = 'manus'
         OR openId LIKE '%manus%'
         OR email LIKE '%manus.space%'`,
    sampleSql: `
      SELECT id, openId, email, loginMethod, role
      FROM users
      WHERE loginMethod = 'manus'
         OR openId LIKE '%manus%'
         OR email LIKE '%manus.space%'
      ORDER BY id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Legacy provider users may need migration to email/OAuth policy.",
    cleanup: "Review accounts; migrate to supported loginMethod if still active.",
  },
  {
    id: "U1b",
    category: "upload",
    severity: "critical",
    title: "Localhost upload URLs in production data",
    countSql: `
      SELECT COUNT(*) AS c FROM (
        SELECT id FROM restaurants WHERE logoUrl LIKE '%localhost%' OR coverUrl LIKE '%localhost%'
           OR logoUrl LIKE '%127.0.0.1%' OR coverUrl LIKE '%127.0.0.1%'
        UNION ALL
        SELECT id FROM menu_items WHERE imageUrl LIKE '%localhost%' OR imageUrl LIKE '%127.0.0.1%'
        UNION ALL
        SELECT id FROM offers WHERE imageUrl LIKE '%localhost%' OR imageUrl LIKE '%127.0.0.1%'
        UNION ALL
        SELECT id FROM restaurant_tables WHERE qrCodeUrl LIKE '%localhost%' OR qrCodeUrl LIKE '%127.0.0.1%'
        UNION ALL
        SELECT id FROM invoices WHERE pdfUrl LIKE '%localhost%' OR pdfUrl LIKE '%127.0.0.1%'
      ) x`,
    sampleSql: `
      SELECT 'restaurant.logo' AS src, id AS entity_id, logoUrl AS url FROM restaurants
        WHERE logoUrl LIKE '%localhost%' OR logoUrl LIKE '%127.0.0.1%' LIMIT 5`,
    impact: "Broken images/PDFs in production menus and invoices.",
    cleanup: "Re-upload assets to R2; update URL columns.",
  },
  {
    id: "G3",
    category: "governance",
    severity: "low",
    title: "Users missing createdAt or updatedAt",
    countSql: `
      SELECT COUNT(*) AS c FROM users
      WHERE createdAt IS NULL OR updatedAt IS NULL`,
    sampleSql: `
      SELECT id, createdAt, updatedAt FROM users
      WHERE createdAt IS NULL OR updatedAt IS NULL
      ORDER BY id LIMIT ${SAMPLE_LIMIT}`,
    impact: "Audit trails incomplete.",
    cleanup: "Backfill timestamps from related records.",
  },
];

async function tableTotals(conn) {
  const tables = [
    "users",
    "restaurants",
    "user_subscriptions",
    "subscription_plans",
    "invoices",
    "renewal_notifications",
    "orders",
    "order_items",
    "restaurant_tables",
    "menu_items",
    "categories",
    "offers",
  ];
  const totals = {};
  for (const t of tables) {
    totals[t] = await count(conn, `SELECT COUNT(*) AS c FROM \`${t}\``);
  }
  return totals;
}

async function main() {
  const conn = await mysql.createConnection(url);
  try {
    const [[{ db: currentDb }]] = await conn.query("SELECT DATABASE() AS db");
    const findings = [];

    for (const check of CHECKS) {
      const cnt = await count(conn, check.countSql);
      const samples = cnt > 0 ? await q(conn, check.sampleSql) : [];
      findings.push({
        id: check.id,
        category: check.category,
        severity: check.severity,
        title: check.title,
        count: cnt,
        samples,
        impact: check.impact,
        cleanup: check.cleanup,
      });
    }

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      if (f.count > 0) bySeverity[f.severity] += 1;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      auditTarget: target,
      databaseName: currentDb || dbNameFromUrl(url),
      tableTotals: await tableTotals(conn),
      findingsWithIssues: findings.filter((f) => f.count > 0),
      findingsAll: findings,
      issueCountBySeverity: bySeverity,
      totalChecksWithIssues: findings.filter((f) => f.count > 0).length,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, auditTarget: target }));
  process.exit(1);
});
