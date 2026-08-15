/**
 * READ-ONLY Production price + identity check. No DML.
 */
import "dotenv/config";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] =
      typeof v === "bigint"
        ? Number(v)
        : v instanceof Date
          ? v.toISOString()
          : v;
  }
  return out;
}

async function main() {
  const url = process.env.DATABASE_URL;
  const conn = await createAuditReadonlyConnection(url);
  const q = async (text, params) => {
    const [rows] = params ? await conn.execute(text, params) : await conn.execute(text);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };
  try {
    const target = auditConnectionTarget(url);
    const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
    const latest = await q(
      "SELECT hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 1"
    );
    const snapshot = await q("SELECT COUNT(*) AS n FROM commercial_subscription_charged_terms");
    const counts = await q(
      `SELECT
         (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
         (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
         (SELECT COUNT(*) FROM commercial_plans) AS plans,
         (SELECT COUNT(*) FROM commercial_prices) AS prices`
    );
    const row780001 = await q(
      `SELECT id, status, billingCycle, planId FROM user_subscriptions WHERE id = 780001`
    );
    const plans = await q(
      `SELECT id, code, name, isHidden FROM commercial_plans ORDER BY code`
    );
    const prices = await q(
      `SELECT p.planId, pl.code AS planCode, p.amount, p.currency, p.billingCycleId, p.regionId
       FROM commercial_prices p
       JOIN commercial_plans pl ON pl.id = p.planId
       ORDER BY pl.code, p.regionId IS NOT NULL, p.amount`
    );
    console.log(
      JSON.stringify(
        {
          mutation: "NONE",
          queriedAt: new Date().toISOString(),
          target: { database: target.database, port: target.port, tls: target.tls },
          session: session[0] ?? null,
          latest_hash: latest[0]?.hash ?? null,
          snapshot_count: snapshot[0]?.n ?? null,
          counts: counts[0] ?? null,
          subscription_780001: row780001,
          plans,
          prices,
        },
        null,
        2
      )
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ mutation: "NONE", reason: String(err) }));
  process.exit(1);
});
