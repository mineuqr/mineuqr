/**
 * DATA-INTEGRITY-1R — MineuQR launch dataset readonly verification.
 * AUDIT-TOOLING-1: TLS via scripts/lib/tidb-audit-connection.mjs
 *
 * Usage (do NOT use workspace .env Monu URL):
 *   DATABASE_URL='<mineuqr-tidb-url>' AUDIT_TARGET=mineuqr-launch-rerun node scripts/data-integrity-1r-mineuqr-readonly.mjs
 */
import {
  auditConnectionTarget,
  createAuditReadonlyConnection,
} from "./lib/tidb-audit-connection.mjs";

const REQUIRED_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";
const REQUIRED_DB = "mineuqr";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error(JSON.stringify({ status: "ABORTED", reason: "DATABASE_URL required" }));
  process.exit(1);
}

const target = auditConnectionTarget(url);
if (target.host !== REQUIRED_HOST || target.database !== REQUIRED_DB) {
  console.log(
    JSON.stringify(
      {
        status: "ABORTED",
        reason: "AUDIT_TARGET_MISMATCH",
        required: { host: REQUIRED_HOST, database: REQUIRED_DB },
        actual: target,
      },
      null,
      2
    )
  );
  process.exit(2);
}

async function q(conn, sql) {
  const [rows] = await conn.query(sql);
  return rows;
}

async function count(conn, sql) {
  const [row] = await q(conn, sql);
  return Number(row.c ?? Object.values(row)[0] ?? 0);
}

async function main() {
  const conn = await createAuditReadonlyConnection(url);
  try {
    const report = {
      status: "OK",
      generatedAt: new Date().toISOString(),
      auditTarget: process.env.AUDIT_TARGET || "mineuqr-launch-rerun",
      connectionTarget: target,
      counts: {
        users: await count(conn, "SELECT COUNT(*) AS c FROM users"),
        restaurants: await count(conn, "SELECT COUNT(*) AS c FROM restaurants"),
        categories: await count(conn, "SELECT COUNT(*) AS c FROM categories"),
        menu_items: await count(conn, "SELECT COUNT(*) AS c FROM menu_items"),
        orders: await count(conn, "SELECT COUNT(*) AS c FROM orders"),
        order_items: await count(conn, "SELECT COUNT(*) AS c FROM order_items"),
        subscriptions: await count(conn, "SELECT COUNT(*) AS c FROM user_subscriptions"),
        invoices: await count(conn, "SELECT COUNT(*) AS c FROM invoices"),
        notifications: await count(conn, "SELECT COUNT(*) AS c FROM renewal_notifications"),
        auth_tokens: await count(conn, "SELECT COUNT(*) AS c FROM auth_tokens"),
      },
      usersByRole: await q(conn, "SELECT role, COUNT(*) AS cnt FROM users GROUP BY role"),
      usersInventory: await q(
        conn,
        `SELECT id, role, loginMethod,
                email IS NOT NULL AS has_email,
                emailVerifiedAt IS NOT NULL AS email_verified,
                createdAt FROM users ORDER BY id`
      ),
      restaurantsByUser: await q(
        conn,
        "SELECT userId, COUNT(*) AS cnt FROM restaurants GROUP BY userId ORDER BY userId"
      ),
      restaurantSlugs: await q(
        conn,
        "SELECT id, userId, slug, isActive FROM restaurants ORDER BY id"
      ),
      categoriesDetail: await q(
        conn,
        "SELECT id, restaurantId, nameAr FROM categories ORDER BY id"
      ),
      menuItemsDetail: await q(
        conn,
        `SELECT m.id, m.restaurantId, m.categoryId, c.restaurantId AS category_restaurantId
         FROM menu_items m
         LEFT JOIN categories c ON c.id = m.categoryId
         ORDER BY m.id`
      ),
      orphanChecks: {
        restaurants_without_user: await count(
          conn,
          "SELECT COUNT(*) AS c FROM restaurants r LEFT JOIN users u ON u.id = r.userId WHERE u.id IS NULL"
        ),
        categories_without_restaurant: await count(
          conn,
          "SELECT COUNT(*) AS c FROM categories c LEFT JOIN restaurants r ON r.id = c.restaurantId WHERE r.id IS NULL"
        ),
        menu_items_without_parents: await count(
          conn,
          `SELECT COUNT(*) AS c FROM menu_items m
           LEFT JOIN restaurants r ON r.id = m.restaurantId
           LEFT JOIN categories c ON c.id = m.categoryId
           WHERE r.id IS NULL OR c.id IS NULL`
        ),
        m3_mismatch: await count(
          conn,
          `SELECT COUNT(*) AS c FROM menu_items m
           JOIN categories c ON c.id = m.categoryId
           WHERE m.restaurantId != c.restaurantId`
        ),
        subscriptions_without_user: await count(
          conn,
          "SELECT COUNT(*) AS c FROM user_subscriptions s LEFT JOIN users u ON u.id = s.userId WHERE u.id IS NULL"
        ),
        subscription_owner_mismatch: await count(
          conn,
          `SELECT COUNT(*) AS c FROM user_subscriptions s
           JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId > 0
           WHERE s.userId != r.userId`
        ),
        invoices_orphan: await count(
          conn,
          `SELECT COUNT(*) AS c FROM invoices i
           LEFT JOIN users u ON u.id = i.userId
           LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
           WHERE u.id IS NULL OR s.id IS NULL`
        ),
        invoice_user_mismatch: await count(
          conn,
          `SELECT COUNT(*) AS c FROM invoices i
           JOIN user_subscriptions s ON s.id = i.subscriptionId
           WHERE i.userId != s.userId`
        ),
      },
      qualityChecks: {
        duplicate_normalized_emails: await count(
          conn,
          `SELECT COUNT(*) AS c FROM (
            SELECT TRIM(LOWER(email)) AS e FROM users
            WHERE email IS NOT NULL AND TRIM(email) <> ''
            GROUP BY TRIM(LOWER(email)) HAVING COUNT(*) > 1) d`
        ),
        duplicate_slugs: await count(
          conn,
          `SELECT COUNT(*) AS c FROM (
            SELECT slug FROM restaurants GROUP BY slug HAVING COUNT(*) > 1) d`
        ),
        localhost_urls: await count(
          conn,
          `SELECT COUNT(*) AS c FROM (
            SELECT id FROM restaurants WHERE logoUrl LIKE '%localhost%' OR coverUrl LIKE '%127.0.0.1%'
            UNION ALL SELECT id FROM menu_items WHERE imageUrl LIKE '%localhost%' OR imageUrl LIKE '%127.0.0.1%'
          ) x`
        ),
        expired_unused_tokens: await count(
          conn,
          "SELECT COUNT(*) AS c FROM auth_tokens WHERE usedAt IS NULL AND expiresAt < UTC_TIMESTAMP()"
        ),
      },
      adminChain: await q(
        conn,
        `SELECT u.id AS user_id, u.role, COUNT(DISTINCT r.id) AS restaurants,
                COUNT(DISTINCT c.id) AS categories, COUNT(DISTINCT m.id) AS menu_items
         FROM users u
         LEFT JOIN restaurants r ON r.userId = u.id
         LEFT JOIN categories c ON c.restaurantId = r.id
         LEFT JOIN menu_items m ON m.restaurantId = r.id
         WHERE u.role = 'admin'
         GROUP BY u.id, u.role`
      ),
      testUserRestaurants: await q(
        conn,
        `SELECT u.id AS user_id, u.role, COUNT(r.id) AS restaurant_count
         FROM users u
         LEFT JOIN restaurants r ON r.userId = u.id
         WHERE u.role = 'user'
         GROUP BY u.id, u.role`
      ),
      subscriptionsSummary: await q(
        conn,
        "SELECT id, userId, restaurantId, status, planId FROM user_subscriptions ORDER BY id"
      ),
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ status: "FAILED", error: e.message }));
  process.exit(1);
});
