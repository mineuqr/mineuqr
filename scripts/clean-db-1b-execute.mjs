/**
 * CLEAN-DB-1B — Execute SAFE cleanup + before/after audit.
 * Usage: node scripts/clean-db-1b-execute.mjs
 */
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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

async function orphanCounts(conn) {
  const sql = {
    orphan_invoices_either: `
      SELECT COUNT(*) AS c FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE u.id IS NULL OR s.id IS NULL`,
    orphan_renewal_notifications_either: `
      SELECT COUNT(*) AS c FROM renewal_notifications n
      LEFT JOIN users u ON u.id = n.userId
      LEFT JOIN user_subscriptions s ON s.id = n.subscriptionId
      WHERE u.id IS NULL OR (n.subscriptionId IS NOT NULL AND s.id IS NULL)`,
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
    orphan_order_items_either: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      WHERE o.id IS NULL OR m.id IS NULL`,
    review_order_items_r1: `
      SELECT COUNT(*) AS c FROM order_items oi
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      LEFT JOIN orders o ON o.id = oi.orderId
      WHERE m.id IS NULL AND o.restaurantId = 1`,
  };
  const counts = {};
  for (const [key, statement] of Object.entries(sql)) {
    const [row] = await q(conn, statement);
    counts[key] = Number(row.c);
  }
  return counts;
}

async function protectedCheck(conn) {
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
    "SELECT id, userId, restaurantId, planId, status, currentPeriodEnd FROM user_subscriptions WHERE id = ?",
    [PROTECTED.subscriptionId]
  );
  return {
    user: user[0] ?? null,
    restaurant: restaurant[0] ?? null,
    subscription: subscription[0] ?? null,
    ok:
      Boolean(user[0]) &&
      Boolean(restaurant[0]) &&
      Boolean(subscription[0]),
  };
}

const DELETE_STEPS = [
  {
    name: "order_items",
    sql: `DELETE oi FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.orderId
      LEFT JOIN menu_items m ON m.id = oi.menuItemId
      LEFT JOIN restaurants r ON r.id = o.restaurantId
      WHERE o.id IS NULL OR r.id IS NULL
        OR (m.id IS NULL AND (o.restaurantId IS NULL OR o.restaurantId != 1))`,
  },
  {
    name: "orders",
    sql: `DELETE o FROM orders o
      LEFT JOIN restaurants r ON r.id = o.restaurantId
      WHERE r.id IS NULL AND o.restaurantId != 1`,
  },
  {
    name: "renewal_notifications",
    sql: `DELETE n FROM renewal_notifications n
      LEFT JOIN users u ON u.id = n.userId
      LEFT JOIN user_subscriptions s ON s.id = n.subscriptionId
      WHERE (u.id IS NULL OR (n.subscriptionId IS NOT NULL AND s.id IS NULL))
        AND n.userId != 1
        AND (n.subscriptionId IS NULL OR n.subscriptionId != 30001)`,
  },
  {
    name: "invoices",
    sql: `DELETE i FROM invoices i
      LEFT JOIN users u ON u.id = i.userId
      LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId
      WHERE (u.id IS NULL OR s.id IS NULL)
        AND i.userId != 1
        AND (i.subscriptionId IS NULL OR i.subscriptionId != 30001)`,
  },
  {
    name: "user_subscriptions",
    sql: `DELETE s FROM user_subscriptions s
      LEFT JOIN users u ON u.id = s.userId
      LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
      WHERE (u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL))
        AND s.id != 30001 AND s.userId != 1`,
  },
  {
    name: "restaurant_tables",
    sql: `DELETE t FROM restaurant_tables t
      LEFT JOIN restaurants r ON r.id = t.restaurantId
      WHERE r.id IS NULL AND t.restaurantId != 1`,
  },
  {
    name: "restaurant_holidays",
    sql: `DELETE h FROM restaurant_holidays h
      LEFT JOIN restaurants r ON r.id = h.restaurantId
      WHERE r.id IS NULL AND h.restaurantId != 1`,
  },
  {
    name: "offers",
    sql: `DELETE f FROM offers f
      LEFT JOIN restaurants r ON r.id = f.restaurantId
      WHERE r.id IS NULL AND f.restaurantId != 1`,
  },
  {
    name: "menu_items",
    sql: `DELETE mi FROM menu_items mi
      LEFT JOIN restaurants r ON r.id = mi.restaurantId
      WHERE r.id IS NULL AND mi.restaurantId != 1`,
  },
  {
    name: "categories",
    sql: `DELETE c FROM categories c
      LEFT JOIN restaurants r ON r.id = c.restaurantId
      WHERE r.id IS NULL AND c.restaurantId != 1`,
  },
  {
    name: "restaurants",
    sql: `DELETE r FROM restaurants r
      LEFT JOIN users u ON u.id = r.userId
      WHERE u.id IS NULL AND r.id != 1`,
  },
];

async function main() {
  const conn = await createAuditReadonlyConnection(url);
  const report = {
    executedAt: new Date().toISOString(),
    script: "scripts/clean-db-1b-cleanup.sql",
    protected: PROTECTED,
    before: {},
    deletedByTable: {},
    after: {},
    protectedAfter: null,
    totalDeleted: 0,
    committed: false,
  };

  try {
    report.before.tableTotals = await tableTotals(conn);
    report.before.orphanCounts = await orphanCounts(conn);
    report.before.protected = await protectedCheck(conn);

    await conn.beginTransaction();

    for (const step of DELETE_STEPS) {
      const [result] = await conn.query(step.sql);
      const affected = result.affectedRows ?? 0;
      report.deletedByTable[step.name] = affected;
      report.totalDeleted += affected;
    }

    await conn.commit();
    report.committed = true;

    report.after.tableTotals = await tableTotals(conn);
    report.after.orphanCounts = await orphanCounts(conn);
    report.protectedAfter = await protectedCheck(conn);

    report.beforeAfterDelta = {};
    for (const t of Object.keys(report.before.tableTotals)) {
      report.beforeAfterDelta[t] =
        report.before.tableTotals[t] - report.after.tableTotals[t];
    }
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    report.error = String(err);
    report.committed = false;
    throw err;
  } finally {
    await conn.end();
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
