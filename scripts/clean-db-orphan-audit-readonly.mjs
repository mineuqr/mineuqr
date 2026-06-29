/**
 * CLEAN-DB-1B — read-only orphan audit. Does not modify data.
 * Usage: node scripts/clean-db-orphan-audit-readonly.mjs
 */
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

const PROTECTED = { userId: 1, restaurantId: 1, subscriptionId: 30001 };

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

async function q(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function countOrphans(conn) {
  const queries = {
    orphan_invoices_user: `
      SELECT COUNT(*) AS c FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      WHERE u.id IS NULL`,
    orphan_invoices_subscription: `
      SELECT COUNT(*) AS c FROM invoices i
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE s.id IS NULL`,
    orphan_invoices_either: `
      SELECT COUNT(*) AS c FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE u.id IS NULL OR s.id IS NULL`,
    orphan_renewal_notifications_user: `
      SELECT COUNT(*) AS c FROM renewal_notifications n
      LEFT JOIN users u ON u.id = n.userId
      WHERE u.id IS NULL`,
    orphan_renewal_notifications_subscription: `
      SELECT COUNT(*) AS c FROM renewal_notifications n
      WHERE n.subscriptionId IS NOT NULL
        AND n.subscriptionId NOT IN (SELECT id FROM user_subscriptions)`,
    orphan_renewal_notifications_either: `
      SELECT COUNT(*) AS c FROM renewal_notifications n
      LEFT JOIN users u ON u.id = n.userId
      LEFT JOIN user_subscriptions s ON s.id = n.subscriptionId
      WHERE u.id IS NULL OR (n.subscriptionId IS NOT NULL AND s.id IS NULL)`,
    orphan_subscriptions_user: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      LEFT JOIN users u ON u.id = s.userId
      WHERE u.id IS NULL`,
    orphan_subscriptions_restaurant: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      WHERE s.restaurantId != 0
        AND s.restaurantId NOT IN (SELECT id FROM restaurants)`,
    orphan_subscriptions_either: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      LEFT JOIN users u ON u.id = s.userId
      LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
      WHERE u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)`,
    orphan_restaurants: `
      SELECT COUNT(*) AS c FROM restaurants r
      LEFT JOIN users u ON u.id = r.userId
      WHERE u.id IS NULL`,
    orphan_orders: `
      SELECT COUNT(*) AS c FROM orders o
      LEFT JOIN restaurants r ON r.id = o.restaurantId
      WHERE r.id IS NULL`,
    orphan_restaurant_tables: `
      SELECT COUNT(*) AS c FROM restaurant_tables t
      LEFT JOIN restaurants r ON r.id = t.restaurantId
      WHERE r.id IS NULL`,
    orphan_order_items_order: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      WHERE o.id IS NULL`,
    orphan_order_items_menu: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      WHERE m.id IS NULL`,
    orphan_order_items_either: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      WHERE o.id IS NULL OR m.id IS NULL`,
  };

  const counts = {};
  for (const [key, sql] of Object.entries(queries)) {
    const [row] = await q(conn, sql);
    counts[key] = Number(row.c);
  }
  return counts;
}

async function sampleIds(conn, limit = 50) {
  return {
    orphan_invoices: await q(
      conn,
      `SELECT i.id, i.userId, i.subscriptionId, i.invoiceNumber
       FROM invoices i
       LEFT JOIN users u ON u.id = i.userId
       LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
       WHERE u.id IS NULL OR s.id IS NULL
       ORDER BY i.id LIMIT ?`,
      [limit]
    ),
    orphan_renewal_notifications: await q(
      conn,
      `SELECT n.id, n.userId, n.subscriptionId, n.notificationType
       FROM renewal_notifications n
       LEFT JOIN users u ON u.id = n.userId
       LEFT JOIN user_subscriptions s ON s.id = n.subscriptionId
       WHERE u.id IS NULL OR (n.subscriptionId IS NOT NULL AND s.id IS NULL)
       ORDER BY n.id LIMIT ?`,
      [limit]
    ),
    orphan_subscriptions: await q(
      conn,
      `SELECT s.id, s.userId, s.restaurantId, s.status
       FROM user_subscriptions s
       LEFT JOIN users u ON u.id = s.userId
       LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
       WHERE u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)
       ORDER BY s.id LIMIT ?`,
      [limit]
    ),
    orphan_restaurants: await q(
      conn,
      `SELECT r.id, r.userId, r.slug, r.nameAr
       FROM restaurants r
       LEFT JOIN users u ON u.id = r.userId
       WHERE u.id IS NULL
       ORDER BY r.id LIMIT ?`,
      [limit]
    ),
    orphan_orders: await q(
      conn,
      `SELECT o.id, o.restaurantId, o.orderNumber
       FROM orders o
       LEFT JOIN restaurants r ON r.id = o.restaurantId
       WHERE r.id IS NULL
       ORDER BY o.id LIMIT ?`,
      [limit]
    ),
    orphan_restaurant_tables: await q(
      conn,
      `SELECT t.id, t.restaurantId, t.tableNumber
       FROM restaurant_tables t
       LEFT JOIN restaurants r ON r.id = t.restaurantId
       WHERE r.id IS NULL
       ORDER BY t.id LIMIT ?`,
      [limit]
    ),
    orphan_order_items: await q(
      conn,
      `SELECT oi.id, oi.orderId, oi.menuItemId
       FROM order_items oi
       LEFT JOIN orders o ON o.id = oi.orderId
       LEFT JOIN menu_items m ON m.id = oi.menuItemId
       WHERE o.id IS NULL OR m.id IS NULL
       ORDER BY oi.id LIMIT ?`,
      [limit]
    ),
  };
}

async function cleanupCandidates(conn) {
  const P = PROTECTED;
  const scope = `
    AND (CASE WHEN ? IS NOT NULL THEN 1=1 END)
  `;

  const candidateSql = {
    invoices: `
      SELECT COUNT(*) AS c FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE (u.id IS NULL OR s.id IS NULL)
        AND i.userId != ?
        AND (i.subscriptionId IS NULL OR i.subscriptionId != ?)`,
    renewal_notifications: `
      SELECT COUNT(*) AS c FROM renewal_notifications n
      LEFT JOIN users u ON u.id = n.userId
      LEFT JOIN user_subscriptions s ON s.id = n.subscriptionId
      WHERE (u.id IS NULL OR (n.subscriptionId IS NOT NULL AND s.id IS NULL))
        AND n.userId != ?
        AND (n.subscriptionId IS NULL OR n.subscriptionId != ?)`,
    user_subscriptions: `
      SELECT COUNT(*) AS c FROM user_subscriptions s
      LEFT JOIN users u ON u.id = s.userId
      LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
      WHERE (u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL))
        AND s.id != ?
        AND s.userId != ?`,
    restaurants: `
      SELECT COUNT(*) AS c FROM restaurants r
      LEFT JOIN users u ON u.id = r.userId
      WHERE u.id IS NULL AND r.id != ?`,
    orders: `
      SELECT COUNT(*) AS c FROM orders o
      LEFT JOIN restaurants r ON r.id = o.restaurantId
      WHERE r.id IS NULL AND o.restaurantId != ?`,
    restaurant_tables: `
      SELECT COUNT(*) AS c FROM restaurant_tables t
      LEFT JOIN restaurants r ON r.id = t.restaurantId
      WHERE r.id IS NULL AND t.restaurantId != ?`,
    order_items: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      WHERE (o.id IS NULL OR m.id IS NULL)
        AND (o.restaurantId IS NULL OR o.restaurantId != ?)`,
  };

  const counts = {};
  counts.invoices = Number(
    (await q(conn, candidateSql.invoices, [P.userId, P.subscriptionId]))[0].c
  );
  counts.renewal_notifications = Number(
    (
      await q(conn, candidateSql.renewal_notifications, [
        P.userId,
        P.subscriptionId,
      ])
    )[0].c
  );
  counts.user_subscriptions = Number(
    (
      await q(conn, candidateSql.user_subscriptions, [
        P.subscriptionId,
        P.userId,
      ])
    )[0].c
  );
  counts.restaurants = Number(
    (await q(conn, candidateSql.restaurants, [P.restaurantId]))[0].c
  );
  counts.orders = Number(
    (await q(conn, candidateSql.orders, [P.restaurantId]))[0].c
  );
  counts.restaurant_tables = Number(
    (await q(conn, candidateSql.restaurant_tables, [P.restaurantId]))[0].c
  );
  counts.order_items = Number(
    (await q(conn, candidateSql.order_items, [P.restaurantId]))[0].c
  );

  return counts;
}

async function protectedVerification(conn) {
  const user = await q(conn, "SELECT id, email, role FROM users WHERE id = ?", [
    PROTECTED.userId,
  ]);
  const restaurant = await q(
    conn,
    "SELECT id, userId, slug, nameAr FROM restaurants WHERE id = ?",
    [PROTECTED.restaurantId]
  );
  const subscription = await q(
    conn,
    "SELECT id, userId, restaurantId, status FROM user_subscriptions WHERE id = ?",
    [PROTECTED.subscriptionId]
  );

  const wouldDelete = {
    user: await q(
      conn,
      `SELECT COUNT(*) AS c FROM users WHERE id = ? AND id NOT IN (
         SELECT 1 FROM users WHERE id = ?
       )`,
      [PROTECTED.userId, PROTECTED.userId]
    ),
    restaurant_in_orphan_restaurants: await q(
      conn,
      `SELECT COUNT(*) AS c FROM restaurants r
       LEFT JOIN users u ON u.id = r.userId
       WHERE u.id IS NULL AND r.id = ?`,
      [PROTECTED.restaurantId]
    ),
    subscription_in_orphan_subs: await q(
      conn,
      `SELECT COUNT(*) AS c FROM user_subscriptions s
       LEFT JOIN users u ON u.id = s.userId
       LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
       WHERE (u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)) AND s.id = ?`,
      [PROTECTED.subscriptionId]
    ),
    invoices_linked: await q(
      conn,
      "SELECT COUNT(*) AS c FROM invoices WHERE userId = ? OR subscriptionId = ?",
      [PROTECTED.userId, PROTECTED.subscriptionId]
    ),
    orders_restaurant_1: await q(
      conn,
      "SELECT COUNT(*) AS c FROM orders WHERE restaurantId = ?",
      [PROTECTED.restaurantId]
    ),
  };

  return { user, restaurant, subscription, wouldDelete };
}

async function tableTotals(conn) {
  const tables = [
    "users",
    "restaurants",
    "user_subscriptions",
    "invoices",
    "renewal_notifications",
    "orders",
    "order_items",
    "restaurant_tables",
    "menu_items",
    "categories",
  ];
  const totals = {};
  for (const t of tables) {
    const [row] = await q(conn, `SELECT COUNT(*) AS c FROM \`${t}\``);
    totals[t] = Number(row.c);
  }
  return totals;
}

async function main() {
  const conn = await createAuditReadonlyConnection(url);
  try {
    const report = {
      generatedAt: new Date().toISOString(),
      protected: PROTECTED,
      tableTotals: await tableTotals(conn),
      orphanCounts: await countOrphans(conn),
      cleanupCandidateCounts: await cleanupCandidates(conn),
      samples: await sampleIds(conn, 100),
      protectedVerification: await protectedVerification(conn),
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
