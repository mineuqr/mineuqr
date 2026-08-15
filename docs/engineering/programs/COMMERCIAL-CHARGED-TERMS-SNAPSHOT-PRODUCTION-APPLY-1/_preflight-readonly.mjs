/**
 * COMMERCIAL-CHARGED-TERMS-SNAPSHOT-PRODUCTION-APPLY-1
 * Read-only preflight. Mutation NONE. No credentials/PII.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAuditReadonlyConnection,
  auditConnectionTarget,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";
import { hashMigrationSql } from "../../../../scripts/lib/migration-governance-lib.cjs";

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

const COMPLETE_BINDING_WHERE = `
  chargedAmount IS NOT NULL
  AND chargedCurrency IS NOT NULL
  AND chargedCurrency <> ''
  AND billingCycleCode IS NOT NULL
  AND billingCycleCode <> ''
  AND planId IS NOT NULL
  AND planId <> ''
`;

async function main() {
  const queriedAt = new Date().toISOString();
  const url = process.env.DATABASE_URL;
  const sqlPath = join(process.cwd(), "drizzle/0089_commercial_charged_terms_snapshots.sql");
  const sql = readFileSync(sqlPath, "utf8");
  const sqlIntegrity = {
    creates_snapshot_table: /CREATE TABLE `commercial_subscription_charged_terms`/.test(sql),
    creates_index: /CREATE INDEX `commercial_charged_terms_sub_effective_idx`/.test(sql),
    insert_select_from_bindings: /INSERT INTO `commercial_subscription_charged_terms`/.test(sql)
      && /FROM `commercial_subscription_bindings`/.test(sql),
    source_migration_0089: /'migration_0089'/.test(sql),
    drop_charged_amount: /DROP COLUMN `chargedAmount`/.test(sql),
    drop_table_bindings: /DROP TABLE `commercial_subscription_bindings`/.test(sql),
    updates: /^\s*UPDATE\b/im.test(sql),
    deletes: /^\s*DELETE\b/im.test(sql),
    touches_user_subscriptions: /user_subscriptions/.test(sql),
    touches_commercial_plans: /commercial_plans/.test(sql),
    touches_commercial_prices: /commercial_prices/.test(sql),
    touches_invoices: /invoices/.test(sql),
    touches_payments: /payments/.test(sql),
    touches_subscription_plans: /subscription_plans/.test(sql),
    hash0089: hashMigrationSql("0089_commercial_charged_terms_snapshots"),
  };

  if (!url) {
    const blocked = { queriedAt, access: "UNAVAILABLE", mutation: "NONE", reason: "DATABASE_URL_MISSING" };
    console.log(JSON.stringify(blocked, null, 2));
    process.exit(2);
  }

  const classify = classifyHost(auditConnectionTarget(url));
  const conn = await createAuditReadonlyConnection(url);
  const q = async (sqlText) => {
    const [rows] = await conn.execute(sqlText);
    return Array.isArray(rows) ? rows.map(asPlain) : rows;
  };

  try {
    const session = await q("SELECT DATABASE() AS db, CURRENT_TIMESTAMP() AS server_ts");
    const journal = await q(
      "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at DESC, id DESC LIMIT 8"
    );
    const journalCount = await q("SELECT COUNT(*) AS n FROM `__drizzle_migrations`");
    const snapshotTable = await q(
      `SELECT TABLE_NAME, ENGINE, TABLE_ROWS
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'commercial_subscription_charged_terms'`
    );
    const bindingColumns = await q(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'commercial_subscription_bindings'
       ORDER BY ORDINAL_POSITION`
    );
    const counts = await q(
      `SELECT
         (SELECT COUNT(*) FROM user_subscriptions) AS subscriptions,
         (SELECT COUNT(*) FROM commercial_subscription_bindings) AS bindings,
         (SELECT COUNT(*) FROM subscription_plans) AS subscription_plans`
    );
    const allBindings = await q(
      `SELECT b.subscriptionId, b.planId, b.chargedAmount, b.chargedCurrency,
              b.billingCycleId, b.billingCycleCode, b.legacyPlanId,
              b.createdAt, b.updatedAt,
              us.id AS subscriptionExists, us.status, us.billingCycle AS subCycle,
              us.planId AS subscriptionPlanId,
              cp.id AS livePlanExists, cp.code AS livePlanCode
       FROM commercial_subscription_bindings b
       LEFT JOIN user_subscriptions us ON us.id = b.subscriptionId
       LEFT JOIN commercial_plans cp ON cp.id = b.planId
       ORDER BY b.subscriptionId`
    );
    const completeBindings = await q(
      `SELECT subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleCode
       FROM commercial_subscription_bindings
       WHERE ${COMPLETE_BINDING_WHERE}
       ORDER BY subscriptionId`
    );
    const incompleteBindings = await q(
      `SELECT subscriptionId, planId, chargedAmount, chargedCurrency, billingCycleCode
       FROM commercial_subscription_bindings
       WHERE NOT (${COMPLETE_BINDING_WHERE})
       ORDER BY subscriptionId`
    );
    const duplicateBindings = await q(
      `SELECT subscriptionId, COUNT(*) AS n
       FROM commercial_subscription_bindings
       GROUP BY subscriptionId
       HAVING n > 1`
    );
    const orphanBindings = await q(
      `SELECT b.subscriptionId
       FROM commercial_subscription_bindings b
       LEFT JOIN user_subscriptions us ON us.id = b.subscriptionId
       WHERE us.id IS NULL`
    );
    const unknownLivePlan = await q(
      `SELECT b.subscriptionId, b.planId
       FROM commercial_subscription_bindings b
       LEFT JOIN commercial_plans cp ON cp.id = b.planId
       WHERE cp.id IS NULL`
    );
    const unbound = await q(
      `SELECT us.id, us.status, us.billingCycle, us.planId
       FROM user_subscriptions us
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE b.id IS NULL
       ORDER BY us.id`
    );
    const row780001 = await q(
      `SELECT us.id, us.status, us.billingCycle, us.planId, us.createdAt, us.updatedAt,
              b.id AS bindingId, b.chargedAmount
       FROM user_subscriptions us
       LEFT JOIN commercial_subscription_bindings b ON b.subscriptionId = us.id
       WHERE us.id = 780001`
    );
    const snapshotCount =
      snapshotTable.length > 0
        ? await q(`SELECT COUNT(*) AS n FROM commercial_subscription_charged_terms`)
        : [{ n: 0 }];

    const expectedBrief = [
      { subscriptionId: 810001, chargedAmount: "19.00", chargedCurrency: "USD", billingCycleCode: "monthly" },
      { subscriptionId: 840001, chargedAmount: "99.00", chargedCurrency: "USD", billingCycleCode: "monthly" },
      { subscriptionId: 870001, chargedAmount: "29.00", chargedCurrency: "USD", billingCycleCode: "monthly" },
    ];

    const evidence = {
      queriedAt,
      access: classify.matchesKnownProductionShape ? "PRODUCTION" : "NON_PRODUCTION_OR_UNVERIFIED",
      mutation: "NONE",
      target: classify,
      session: session[0] ?? null,
      sqlIntegrity,
      journal_latest: journal,
      journal_row_count: journalCount[0]?.n ?? null,
      snapshot_table_exists: snapshotTable.length > 0,
      snapshot_table: snapshotTable,
      snapshot_count: snapshotCount[0]?.n ?? 0,
      binding_columns: bindingColumns.map((c) => c.COLUMN_NAME),
      binding_charged_columns_present: ["chargedAmount", "chargedCurrency", "billingCycleCode"].every(
        (name) => bindingColumns.some((c) => c.COLUMN_NAME === name)
      ),
      counts: counts[0] ?? null,
      all_bindings: allBindings,
      complete_bindings: completeBindings,
      incomplete_bindings: incompleteBindings,
      duplicate_bindings: duplicateBindings,
      orphan_bindings: orphanBindings,
      unknown_live_plan_bindings: unknownLivePlan,
      unbound_subscriptions: unbound,
      subscription_780001: row780001,
      program_brief_expected_candidates: expectedBrief,
    };

    const outDir = dirname(fileURLToPath(import.meta.url));
    writeFileSync(join(outDir, "_PREFLIGHT-EVIDENCE.json"), `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ access: "UNAVAILABLE", reason: String(err), mutation: "NONE" }));
  process.exit(1);
});
