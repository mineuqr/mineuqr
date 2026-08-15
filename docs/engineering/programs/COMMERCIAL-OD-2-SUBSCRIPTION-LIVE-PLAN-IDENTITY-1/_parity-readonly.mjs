import "dotenv/config";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "bigint" ? Number(v) : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}
const url = process.env.DATABASE_URL;
const t = auditConnectionTarget(url);
if (t.database !== "mineuqr") process.exit(1);
const conn = await createAuditReadonlyConnection(url);
try {
  const [rows] = await conn.execute(`
    SELECT
      COUNT(*) AS n,
      COUNT(DISTINCT id) AS distinctIds,
      COUNT(DISTINCT userId) AS distinctUsers,
      SUM(userId IS NULL) AS nullUser,
      SUM(restaurantId IS NULL) AS nullRestaurant,
      SUM(billingCycle IS NULL) AS nullCycle,
      SUM(currentPeriodStart IS NULL) AS nullStart,
      SUM(currentPeriodEnd IS NULL) AS nullEnd,
      SUM(billingCycle='monthly') AS monthlyN,
      SUM(billingCycle='yearly') AS yearlyN
    FROM user_subscriptions`);
  console.log(JSON.stringify(asPlain(rows[0]), null, 2));
} finally {
  await conn.end();
}
