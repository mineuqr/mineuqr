/**
 * CLEAN-DB-2 execution preview — read-only counts only.
 * Usage: node -r dotenv/config scripts/clean-db-2-execution-preview-readonly.mjs
 */
import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

const KEEP_EMAIL = "k.sh61@yahoo.com";

async function cnt(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return Number(rows[0].c);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const conn = await createAuditReadonlyConnection(url);
  try {
    const [[{ db }]] = await conn.query("SELECT DATABASE() AS db");
    const [adminRows] = await conn.query(
      `SELECT id, email, role, openId, name FROM users
       WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))`,
      [KEEP_EMAIL]
    );
    const admin = adminRows[0];
    if (!admin) {
      console.log(JSON.stringify({ error: "KEEP user not found", email: KEEP_EMAIL }));
      process.exit(1);
    }
    const adminId = admin.id;

    const tableNames = [
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
      "restaurant_holidays",
      "auth_tokens",
    ];

    const tableTotals = {};
    for (const t of tableNames) {
      tableTotals[t] = await cnt(conn, `SELECT COUNT(*) AS c FROM \`${t}\``);
    }

    const deleteCounts = {
      users: await cnt(conn, "SELECT COUNT(*) AS c FROM users WHERE id != ?", [
        adminId,
      ]),
      restaurants: await cnt(conn, "SELECT COUNT(*) AS c FROM restaurants"),
      user_subscriptions: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM user_subscriptions"
      ),
      orders: await cnt(conn, "SELECT COUNT(*) AS c FROM orders"),
      order_items: await cnt(conn, "SELECT COUNT(*) AS c FROM order_items"),
      restaurant_tables: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM restaurant_tables"
      ),
      categories: await cnt(conn, "SELECT COUNT(*) AS c FROM categories"),
      menu_items: await cnt(conn, "SELECT COUNT(*) AS c FROM menu_items"),
      offers: await cnt(conn, "SELECT COUNT(*) AS c FROM offers"),
      restaurant_holidays: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM restaurant_holidays"
      ),
      invoices: await cnt(conn, "SELECT COUNT(*) AS c FROM invoices"),
      renewal_notifications: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM renewal_notifications"
      ),
      auth_tokens: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM auth_tokens WHERE userId != ?",
        [adminId]
      ),
    };

    const adminResidual = {
      restaurants: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM restaurants WHERE userId = ?",
        [adminId]
      ),
      user_subscriptions: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM user_subscriptions WHERE userId = ?",
        [adminId]
      ),
      invoices: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM invoices WHERE userId = ?",
        [adminId]
      ),
      renewal_notifications: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM renewal_notifications WHERE userId = ?",
        [adminId]
      ),
      auth_tokens: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM auth_tokens WHERE userId = ?",
        [adminId]
      ),
    };

    const [usersToDelete] = await conn.query(
      "SELECT id, email, role, openId FROM users WHERE id != ? ORDER BY id",
      [adminId]
    );
    const [restaurants] = await conn.query(
      "SELECT id, userId, slug, nameAr FROM restaurants ORDER BY id"
    );
    const [subscriptions] = await conn.query(
      "SELECT id, userId, restaurantId, status FROM user_subscriptions ORDER BY id"
    );

    const orphanAfterRestaurantDelete = {
      subscriptions_restaurantId_nonzero_remaining: await cnt(
        conn,
        "SELECT COUNT(*) AS c FROM user_subscriptions WHERE restaurantId != 0"
      ),
      notifications_without_subscription_after_sub_delete:
        "N/A until execution — delete subs before orphan notif check",
    };

    console.log(
      JSON.stringify(
        {
          database: db,
          generatedAt: new Date().toISOString(),
          keepUser: admin,
          roleNote:
            admin.role === "admin"
              ? "Schema enum is 'admin' (no super_admin value in DB)"
              : `Actual role: ${admin.role}`,
          protected: {
            userId: adminId,
            email: KEEP_EMAIL,
            legacyCleanDb1b: { userId: 1, restaurantId: 1, subscriptionId: 30001 },
          },
          tableTotals,
          deleteCounts,
          adminResidualAfterFullDelete: adminResidual,
          subscription_plans: {
            total: tableTotals.subscription_plans,
            action: "KEEP (catalog — not in DELETE list)",
          },
          usersToDelete,
          restaurantsToDelete: restaurants,
          subscriptionsToDelete: subscriptions,
          orphanAfterRestaurantDelete,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
