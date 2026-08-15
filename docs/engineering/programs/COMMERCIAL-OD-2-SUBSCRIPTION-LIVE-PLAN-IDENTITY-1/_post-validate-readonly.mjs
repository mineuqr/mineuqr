/**
 * COMMERCIAL-OD-2-0088-PRODUCTION-APPLY-1 — post-cutover SELECT only.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const EXPECTED = {
  basic: "79cf7bf7-c3b6-45de-8f20-42897cd493ac",
  professional: "0ade795a-02fa-4d3e-b9b5-262515bade09",
  enterprise: "d836bd10-9d9f-4408-a076-f921354d785a",
};

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

const url = process.env.DATABASE_URL;
const target = auditConnectionTarget(url);
const host = target.host ?? "";
if (
  !/\.tidbcloud\.com$/i.test(host) ||
  !/\.prod\./i.test(host) ||
  !/^gateway01\./i.test(host) ||
  target.database !== "mineuqr"
) {
  console.log(JSON.stringify({ post: "STOP", reason: "TARGET" }));
  process.exit(1);
}

const hash0088 = createHash("sha256")
  .update(readFileSync(join(ROOT, "drizzle/0088_user_subscriptions_live_plan_identity.sql"), "utf8"))
  .digest("hex");

const conn = await createAuditReadonlyConnection(url);
try {
  const col = await q(
    conn,
    `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions' AND COLUMN_NAME = 'planId'`
  );
  const leftover = await q(
    conn,
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions'
       AND COLUMN_NAME IN ('planIdUuid')`
  );
  const hits = await q(
    conn,
    `SELECT id, hash, created_at FROM __drizzle_migrations WHERE hash = '${hash0088}'`
  );
  const latest = await q(
    conn,
    `SELECT id, LEFT(hash,16) AS hashPrefix FROM __drizzle_migrations ORDER BY id DESC LIMIT 1`
  );
  const pop = await q(
    conn,
    `SELECT us.planId, cp.code, COUNT(*) AS n,
            SUM(us.status='active') AS activeN,
            SUM(us.status='expired') AS expiredN,
            SUM(us.status='trial') AS trialN,
            SUM(us.status='canceled') AS canceledN
     FROM user_subscriptions us
     LEFT JOIN commercial_plans cp ON cp.id = us.planId
     GROUP BY us.planId, cp.code`
  );
  const totals = await q(
    conn,
    `SELECT COUNT(*) AS n,
            SUM(status='active') AS activeN,
            SUM(status='expired') AS expiredN,
            SUM(status='trial') AS trialN,
            SUM(status='canceled') AS canceledN,
            SUM(planId IS NULL) AS nullN
     FROM user_subscriptions`
  );
  const orphan = await q(
    conn,
    `SELECT COUNT(*) AS n FROM user_subscriptions us
     LEFT JOIN commercial_plans cp ON cp.id = us.planId
     WHERE cp.id IS NULL`
  );
  const disagree = await q(
    conn,
    `SELECT COUNT(*) AS n
     FROM commercial_subscription_bindings b
     INNER JOIN user_subscriptions us ON us.id = b.subscriptionId
     WHERE b.planId <> us.planId`
  );
  const charged = await q(
    conn,
    `SELECT COUNT(*) AS n,
            SUM(chargedAmount IS NOT NULL) AS amountN
     FROM commercial_subscription_bindings`
  );
  const nonUuid = pop.filter((r) => !/^[0-9a-f-]{36}$/i.test(String(r.planId)));
  const t = totals[0];
  const report = {
    post: "OK",
    planIdType: col[0]?.COLUMN_TYPE,
    nullable: col[0]?.IS_NULLABLE,
    leftoverUuidCol: leftover.length,
    applied0088: hits.length === 1,
    appliedId: hits[0]?.id ?? null,
    latestHashPrefix: latest[0]?.hashPrefix ?? null,
    rows: Number(t.n),
    active: Number(t.activeN),
    expired: Number(t.expiredN),
    trial: Number(t.trialN),
    canceled: Number(t.canceledN),
    nullPlanId: Number(t.nullN),
    orphan: Number(orphan[0].n),
    nonUuid: nonUuid.length,
    bindingDisagree: Number(disagree[0].n),
    bindings: Number(charged[0].n),
    chargedAmountPresent: Number(charged[0].amountN),
    byPlan: pop.map((r) => ({
      uuid: r.planId,
      code: r.code,
      n: Number(r.n),
    })),
  };
  writeFileSync(join(HERE, "_POST-VALIDATE-EVIDENCE.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const fail =
    !String(col[0]?.COLUMN_TYPE ?? "").includes("varchar") ||
    col[0]?.IS_NULLABLE !== "NO" ||
    leftover.length !== 0 ||
    hits.length !== 1 ||
    Number(t.n) !== 7 ||
    Number(t.activeN) !== 5 ||
    Number(t.expiredN) !== 2 ||
    Number(t.nullN) !== 0 ||
    Number(orphan[0].n) !== 0 ||
    nonUuid.length !== 0 ||
    Number(disagree[0].n) !== 0;
  process.exit(fail ? 1 : 0);
} finally {
  await conn.end();
}
