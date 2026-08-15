/**
 * COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1
 * Read-only preflight for 0088. SELECT aggregates only.
 * Does not modify data. Does not print credentials or PII.
 *
 * Usage: node scripts/0088-live-plan-identity-preflight.mjs
 * Exit 0 = PASS. Exit 1 = FAIL CLOSED. Exit 2 = blocked (no URL / not mineuqr).
 *
 * This script does NOT apply 0088.
 */
import "dotenv/config";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "./lib/tidb-audit-connection.mjs";
import {
  validate0088Conversion,
} from "./lib/live-plan-identity-0088-validation.cjs";

function asPlain(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "bigint" ? Number(v) : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

async function q(conn, sql) {
  const [rows] = await conn.execute(sql);
  return Array.isArray(rows) ? rows.map(asPlain) : rows;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(
      JSON.stringify({
        preflight: "BLOCKED",
        reason: "DATABASE_URL_MISSING",
        statements: "NONE",
        mutation: "NONE",
      })
    );
    process.exit(2);
  }

  const target = auditConnectionTarget(url);
  if (target.database !== "mineuqr") {
    console.log(
      JSON.stringify({
        preflight: "BLOCKED",
        reason: "DATABASE_NOT_MINEUQR",
        database: target.database,
        statements: "NONE",
        mutation: "NONE",
      })
    );
    process.exit(2);
  }

  const conn = await createAuditReadonlyConnection(url);
  try {
    const distinctPlanIds = await q(
      conn,
      "SELECT `planId` AS planId, COUNT(*) AS n FROM `user_subscriptions` GROUP BY `planId` ORDER BY `planId`"
    );
    const sourceCountRows = await q(
      conn,
      "SELECT COUNT(*) AS n FROM `user_subscriptions`"
    );
    const livePlans = await q(
      conn,
      "SELECT `id` AS id, `code` AS code FROM `commercial_plans`"
    );
    const bindings = await q(
      conn,
      "SELECT `subscriptionId` AS subscriptionId, `planId` AS planId FROM `commercial_subscription_bindings`"
    );
    const subscriptions = await q(
      conn,
      "SELECT `id` AS id, `planId` AS planId FROM `user_subscriptions`"
    );

    const result = validate0088Conversion({
      subscriptions,
      livePlans,
      bindings,
      populated: false,
    });

    const report = {
      preflight: result.ok ? "PASS" : "FAIL_CLOSED",
      mutation: "NONE",
      statements: "SELECT_ONLY",
      sourceCount: Number(sourceCountRows[0]?.n ?? 0),
      distinctPlanIds: distinctPlanIds.map((r) => ({
        planId: r.planId,
        n: Number(r.n),
      })),
      livePlanCodes: livePlans.map((p) => p.code).sort(),
      livePlanCount: livePlans.length,
      bindingCount: bindings.length,
      failureCodes: result.failureCodes,
      convertedCount: result.convertedCount,
    };

    console.log(JSON.stringify(report, null, 2));
    process.exit(result.ok ? 0 : 1);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.log(
    JSON.stringify({
      preflight: "FAIL_CLOSED",
      reason: "QUERY_ERROR",
      mutation: "NONE",
    })
  );
  console.error(err instanceof Error ? err.message : "query_failed");
  process.exit(1);
});
