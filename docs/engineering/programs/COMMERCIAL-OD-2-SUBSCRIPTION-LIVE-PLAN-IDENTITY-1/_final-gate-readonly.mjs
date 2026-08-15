/**
 * COMMERCIAL-OD-2-0088-PRODUCTION-APPLY-1 — final SELECT-only gate.
 * Exit 0 = apply may proceed. Exit 1 = STOP. No DDL/DML.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";
import { validate0088Conversion } from "../../../../scripts/lib/live-plan-identity-0088-validation.cjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
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
function hashSql(rel) {
  return createHash("sha256").update(readFileSync(join(ROOT, rel), "utf8")).digest("hex");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.log(JSON.stringify({ gate: "STOP", reason: "DATABASE_URL_MISSING" }));
  process.exit(1);
}
const target = auditConnectionTarget(url);
const host = target.host ?? "";
const okTarget =
  /\.tidbcloud\.com$/i.test(host) &&
  /\.prod\./i.test(host) &&
  /^gateway01\./i.test(host) &&
  target.database === "mineuqr";
if (!okTarget) {
  console.log(
    JSON.stringify({
      gate: "STOP",
      reason: "PRODUCTION_TARGET_NOT_VERIFIED",
      database: target.database,
    })
  );
  process.exit(1);
}

const sql = readFileSync(join(ROOT, "drizzle/0088_user_subscriptions_live_plan_identity.sql"), "utf8");
const gateAt = sql.indexOf("INSERT INTO `_0088_live_plan_identity_gate` (`ok`)\nSELECT 1");
const dropAt = sql.indexOf("ALTER TABLE `user_subscriptions` DROP COLUMN `planId`");
if (
  !sql.includes("COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1") ||
  !sql.includes("WHEN 30001 THEN 'basic'") ||
  /79cf7bf7|0ade795a|d836bd10/.test(sql) ||
  gateAt < 0 ||
  dropAt <= gateAt
) {
  console.log(JSON.stringify({ gate: "STOP", reason: "0088_FILE_NOT_CORRECTED" }));
  process.exit(1);
}

const hash0087 = hashSql("drizzle/0087_platform_owner_access_mode.sql");
const hash0088 = hashSql("drizzle/0088_user_subscriptions_live_plan_identity.sql");
const conn = await createAuditReadonlyConnection(url);
try {
  const db = await q(conn, "SELECT DATABASE() AS dbName");
  const hits = await q(
    conn,
    `SELECT hash FROM __drizzle_migrations WHERE hash IN ('${hash0087}','${hash0088}')`
  );
  const col = await q(
    conn,
    `SELECT COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions' AND COLUMN_NAME = 'planId'`
  );
  const uuidCol = await q(
    conn,
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_subscriptions' AND COLUMN_NAME = 'planIdUuid'`
  );
  const subs = await q(conn, "SELECT id, planId FROM user_subscriptions");
  const plans = await q(conn, "SELECT id, code FROM commercial_plans");
  const bindings = await q(
    conn,
    "SELECT subscriptionId, planId FROM commercial_subscription_bindings"
  );
  const invalid = await q(
    conn,
    `SELECT SUM(planId IS NULL) AS nullCount FROM user_subscriptions`
  );
  const conversion = validate0088Conversion({
    subscriptions: subs,
    livePlans: plans,
    bindings,
    populated: false,
  });
  const byCode = Object.fromEntries(plans.map((p) => [p.code, p.id]));
  const uuidDrift =
    byCode.basic !== EXPECTED.basic ||
    byCode.professional !== EXPECTED.professional ||
    byCode.enterprise !== EXPECTED.enterprise;
  const applied0087 = hits.some((r) => r.hash === hash0087);
  const applied0088 = hits.some((r) => r.hash === hash0088);
  const planInt = /int/i.test(String(col[0]?.COLUMN_TYPE ?? ""));
  const stops = [];
  if (db[0]?.dbName !== "mineuqr") stops.push("db_not_mineuqr");
  if (!applied0087) stops.push("0087_not_applied");
  if (applied0088) stops.push("0088_already_applied");
  if (!planInt || col[0]?.IS_NULLABLE !== "NO") stops.push("planId_not_int_not_null");
  if (uuidCol.length) stops.push("planIdUuid_already_exists");
  if (subs.length !== 7) stops.push(`row_count_${subs.length}`);
  if (Number(invalid[0]?.nullCount ?? 1) !== 0) stops.push("null_planId");
  if (!conversion.ok || conversion.convertedCount !== 7) stops.push("conversion_not_7");
  if (uuidDrift) stops.push("live_plan_uuid_drift");
  const report = {
    gate: stops.length ? "STOP" : "PASS",
    stops,
    database: db[0]?.dbName,
    applied0087,
    applied0088,
    planIdType: col[0]?.COLUMN_TYPE,
    rows: subs.length,
    converted: conversion.convertedCount,
    failureCodes: conversion.failureCodes,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(stops.length ? 1 : 0);
} finally {
  await conn.end();
}
