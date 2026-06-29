import { createAuditReadonlyConnection } from "./lib/tidb-audit-connection.mjs";

const url = process.env.DATABASE_URL;
if (!url) process.exit(1);
const conn = await createAuditReadonlyConnection(url);
const q = async (sql) => {
  const [r] = await conn.query(sql);
  return r;
};

const subs = await q(`
  SELECT s.id, s.userId, s.restaurantId, s.status FROM user_subscriptions s
  LEFT JOIN users u ON u.id = s.userId
  LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
  WHERE u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)
  ORDER BY s.id`);

const rest = await q(`
  SELECT r.id, r.userId, r.slug FROM restaurants r
  LEFT JOIN users u ON u.id = r.userId WHERE u.id IS NULL`);

const oiBreakdown = await q(`
  SELECT
    SUM(CASE WHEN o.restaurantId = 1 THEN 1 ELSE 0 END) AS on_restaurant_1,
    SUM(CASE WHEN o.restaurantId IS NULL OR o.restaurantId != 1 THEN 1 ELSE 0 END) AS cleanup_scope
  FROM order_items oi
  LEFT JOIN menu_items m ON m.id = oi.menuItemId
  LEFT JOIN orders o ON o.id = oi.orderId
  WHERE m.id IS NULL`);

const oiRest1Ids = await q(`
  SELECT oi.id, oi.orderId, oi.menuItemId, o.restaurantId
  FROM order_items oi
  LEFT JOIN menu_items m ON m.id = oi.menuItemId
  LEFT JOIN orders o ON o.id = oi.orderId
  WHERE m.id IS NULL AND o.restaurantId = 1
  ORDER BY oi.id`);

const validSubs = await q(`
  SELECT id, userId, restaurantId, status FROM user_subscriptions
  WHERE id NOT IN (
    SELECT s.id FROM user_subscriptions s
    LEFT JOIN users u ON u.id = s.userId
    LEFT JOIN restaurants r ON r.id = s.restaurantId AND s.restaurantId != 0
    WHERE u.id IS NULL OR (s.restaurantId != 0 AND r.id IS NULL)
  )`);

const validInv = await q(`
  SELECT COUNT(*) AS c FROM invoices i
  JOIN users u ON u.id = i.userId
  JOIN user_subscriptions s ON s.id = i.subscriptionId`);

const validNotif = await q(`
  SELECT COUNT(*) AS c FROM renewal_notifications n
  JOIN users u ON u.id = n.userId
  WHERE n.subscriptionId IS NULL
     OR EXISTS (SELECT 1 FROM user_subscriptions s WHERE s.id = n.subscriptionId)`);

const authOrphan = await q(`
  SELECT COUNT(*) AS c FROM auth_tokens t
  LEFT JOIN users u ON u.id = t.userId WHERE u.id IS NULL`);

console.log(
  JSON.stringify(
    { subs, rest, oiBreakdown: oiBreakdown[0], oiRest1Ids, validSubs, validInv: validInv[0], validNotif: validNotif[0], authOrphan: authOrphan[0] },
    null,
    2
  )
);
await conn.end();
