/**
 * COMMERCIAL-OD-2-0088-PRODUCTION-PREFLIGHT-1
 * SELECT + INFORMATION_SCHEMA only. No DDL/DML. Does not apply 0088.
 * Does not print credentials, connection strings, or PII.
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
import { validate0088Conversion } from "../../../../scripts/lib/live-plan-identity-0088-validation.cjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");

const BRIDGE = [
  { legacyPlanId: 30001, catalogPlanCode: "basic" },
  { legacyPlanId: 30002, catalogPlanCode: "professional" },
  { legacyPlanId: 30003, catalogPlanCode: "enterprise" },
];

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

function classifyHost(target) {
  const host = target.host ?? "";
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  const looksProd = /\.prod\./i.test(host);
  const looksGateway01 = /^gateway01\./i.test(host);
  return {
    hostKind: isTidbCloud ? "tidb_cloud" : "other",
    database: target.database,
    tls: target.tls,
    port: target.port,
    hostPattern: isTidbCloud
      ? looksProd
        ? "tidbcloud_prod"
        : "tidbcloud_non_prod_pattern"
      : "not_tidbcloud",
    matchesKnownProductionShape:
      isTidbCloud && looksProd && looksGateway01 && target.database === "mineuqr",
  };
}

function hashSql(rel) {
  return createHash("sha256").update(readFileSync(join(ROOT, rel), "utf8")).digest("hex");
}

function writeEvidence(obj) {
  writeFileSync(join(HERE, "_PREFLIGHT-EVIDENCE.json"), JSON.stringify(obj, null, 2));
}

async function main() {
  const queriedAt = new Date().toISOString();
  const url = process.env.DATABASE_URL;
  if (!url) {
    writeEvidence({
      queriedAt,
      access: "BLOCKED",
      reason: "DATABASE_URL_MISSING",
      statements: "NONE",
      mutation: "NONE",
    });
    console.log(JSON.stringify({ preflight: "BLOCKED", reason: "DATABASE_URL_MISSING", mutation: "NONE" }));
    process.exit(2);
  }

  const target = auditConnectionTarget(url);
  const access = classifyHost(target);
  if (!access.matchesKnownProductionShape) {
    writeEvidence({
      queriedAt,
      access: "BLOCKED",
      reason: "PRODUCTION_TARGET_NOT_VERIFIED",
      hostKind: access.hostKind,
      hostPattern: access.hostPattern,
      database: access.database,
      statements: "NONE",
      mutation: "NONE",
    });
    console.log(
      JSON.stringify({
        preflight: "BLOCKED",
        reason: "PRODUCTION_TARGET_NOT_VERIFIED",
        hostKind: access.hostKind,
        hostPattern: access.hostPattern,
        database: access.database,
        mutation: "NONE",
      })
    );
    process.exit(2);
  }

  const hash0087 = hashSql("drizzle/0087_platform_owner_access_mode.sql");
  const hash0088 = hashSql("drizzle/0088_user_subscriptions_live_plan_identity.sql");
  const sql0088 = readFileSync(
    join(ROOT, "drizzle/0088_user_subscriptions_live_plan_identity.sql"),
    "utf8"
  );
  const gate = sql0088.indexOf("INSERT INTO `_0088_live_plan_identity_gate` (`ok`)\nSELECT 1");
  const drop = sql0088.indexOf("ALTER TABLE `user_subscriptions` DROP COLUMN `planId`");
  const migrationIntegrity = {
    hasSafetyHeader: sql0088.includes("COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1"),
    mapsViaCode: sql0088.includes("WHEN 30001 THEN 'basic'"),
    noHardcodedProdUuids: !/79cf7bf7|0ade795a|d836bd10/.test(sql0088),
    gateBeforeDrop: gate > -1 && drop > gate,
    noChargedTermsTouch: !/chargedAmount|subscription_plans/.test(
      sql0088.replace(/Does NOT touch[\s\S]*subscription_plans\./, "")
    ),
  };

  const conn = await createAuditReadonlyConnection(url);
  try {
    const nowRow = await q(conn, "SELECT UTC_TIMESTAMP() AS utcNow, DATABASE() AS dbName");
    const terminus = await q(
      conn,
      `SELECT id, hash, created_at
       FROM __drizzle_migrations
       ORDER BY id DESC
       LIMIT 8`
    );
    const hashHits = await q(
      conn,
      `SELECT hash, id, created_at FROM __drizzle_migrations
       WHERE hash IN ('${hash0087}', '${hash0088}')`
    );
    const planIdCol = await q(
      conn,
      `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_subscriptions'
         AND COLUMN_NAME = 'planId'`
    );
    const planIdUuidCol = await q(
      conn,
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'user_subscriptions'
         AND COLUMN_NAME = 'planIdUuid'`
    );
    const statusTotals = await q(
      conn,
      `SELECT status, COUNT(*) AS n FROM user_subscriptions GROUP BY status`
    );
    const planIdPopulation = await q(
      conn,
      `SELECT planId, COUNT(*) AS n,
              SUM(status = 'active') AS activeN,
              SUM(status = 'trial') AS trialN,
              SUM(status = 'expired') AS expiredN,
              SUM(status = 'canceled') AS canceledN
       FROM user_subscriptions GROUP BY planId ORDER BY planId`
    );
    const invalidPlanIds = await q(
      conn,
      `SELECT
         SUM(planId IS NULL) AS nullCount,
         SUM(planId = 0) AS zeroCount,
         SUM(planId < 0) AS negativeCount
       FROM user_subscriptions`
    );
    const livePlans = await q(
      conn,
      `SELECT id, code, isHidden FROM commercial_plans ORDER BY code, id`
    );
    const duplicateCodes = await q(
      conn,
      `SELECT code, COUNT(*) AS n FROM commercial_plans GROUP BY code HAVING COUNT(*) > 1`
    );
    const subscriptions = await q(
      conn,
      `SELECT id, planId FROM user_subscriptions`
    );
    const bindings = await q(
      conn,
      `SELECT subscriptionId, planId, legacyPlanId,
              chargedAmount, chargedCurrency, billingCycleCode
       FROM commercial_subscription_bindings`
    );
    const unbound = await q(
      conn,
      `SELECT us.planId, us.status, COUNT(*) AS n
       FROM user_subscriptions us
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE b.id IS NULL
       GROUP BY us.planId, us.status`
    );
    const boundCount = await q(
      conn,
      `SELECT COUNT(*) AS n
       FROM user_subscriptions us
       INNER JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id`
    );
    const mrrEligibleIncomplete = await q(
      conn,
      `SELECT COUNT(*) AS n
       FROM user_subscriptions us
       INNER JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE us.status IN ('active', 'trial')
         AND (b.chargedAmount IS NULL OR b.chargedAmount = '')`
    );

    const conversion = validate0088Conversion({
      subscriptions,
      livePlans,
      bindings: bindings.map((b) => ({
        subscriptionId: b.subscriptionId,
        planId: b.planId,
      })),
      populated: false,
    });

    const preview = BRIDGE.map((b) => {
      const plans = livePlans.filter(
        (p) => String(p.code).toLowerCase() === b.catalogPlanCode
      );
      const pop = planIdPopulation.find((r) => Number(r.planId) === b.legacyPlanId);
      return {
        integer: b.legacyPlanId,
        code: b.catalogPlanCode,
        uuid: plans.length === 1 ? plans[0].id : null,
        catalogRows: plans.length,
        subscriptionCount: Number(pop?.n ?? 0),
      };
    });

    const latest = terminus[0] ?? null;
    const applied0087 = hashHits.some((r) => r.hash === hash0087);
    const applied0088 = hashHits.some((r) => r.hash === hash0088);
    const planType = String(planIdCol[0]?.COLUMN_TYPE ?? "");
    const planIdIsInteger = /int/i.test(planType);
    const unknownIds = planIdPopulation.filter(
      (r) => !BRIDGE.some((b) => b.legacyPlanId === Number(r.planId))
    );

    const evidence = {
      queriedAt,
      utcNow: nowRow[0]?.utcNow ?? null,
      dbName: nowRow[0]?.dbName ?? null,
      access,
      mutation: "NONE",
      statements: "SELECT_AND_INFORMATION_SCHEMA",
      journal: {
        latestId: latest?.id ?? null,
        latestHashPrefix: latest ? String(latest.hash).slice(0, 16) : null,
        applied0087,
        applied0088,
        hash0087Prefix: hash0087.slice(0, 16),
        hash0088Prefix: hash0088.slice(0, 16),
      },
      schema: {
        planId: planIdCol[0] ?? null,
        planIdIsInteger,
        planIdUuidPresent: planIdUuidCol.length > 0,
      },
      population: {
        total: subscriptions.length,
        byPlan: planIdPopulation,
        byStatus: statusTotals,
        invalid: invalidPlanIds[0] ?? null,
        unknownIds,
      },
      livePlans: livePlans.map((p) => ({
        code: p.code,
        id: p.id,
        isHidden: p.isHidden,
      })),
      duplicateCodes,
      conversion: {
        ok: conversion.ok,
        failureCodes: conversion.failureCodes,
        sourceCount: conversion.sourceCount,
        convertedCount: conversion.convertedCount,
      },
      preview,
      bindings: {
        count: bindings.length,
        boundSubscriptions: Number(boundCount[0]?.n ?? 0),
        unboundByPlanStatus: unbound,
        disagreement: conversion.failureCodes.includes("binding_mismatch"),
        activeTrialMissingChargedAmount: Number(mrrEligibleIncomplete[0]?.n ?? 0),
      },
      migrationIntegrity,
    };

    writeEvidence(evidence);
    console.log(
      JSON.stringify(
        {
          preflight: conversion.ok && planIdIsInteger && applied0087 && !applied0088
            ? "DATA_GATES_OK"
            : "DATA_GATES_NOT_OK",
          queriedAt,
          dbName: evidence.dbName,
          hostPattern: access.hostPattern,
          applied0087,
          applied0088,
          planIdType: planType,
          total: subscriptions.length,
          byPlan: planIdPopulation.map((r) => ({ planId: r.planId, n: Number(r.n) })),
          invalid: invalidPlanIds[0],
          unknownCount: unknownIds.length,
          conversionOk: conversion.ok,
          failureCodes: conversion.failureCodes,
          preview,
          bindings: evidence.bindings.count,
          unbound: unbound.reduce((s, r) => s + Number(r.n), 0),
          mrrIncompleteCharged: evidence.bindings.activeTrialMissingChargedAmount,
          migrationIntegrity,
          mutation: "NONE",
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
  writeEvidence({
    queriedAt: new Date().toISOString(),
    access: "FAILED",
    reason: "QUERY_ERROR",
    mutation: "NONE",
  });
  console.error(err instanceof Error ? err.message : "query_failed");
  process.exit(1);
});
