/**
 * EXEC-4 — Commercial Authority Backfill (AR-6 execution).
 *
 * Modes (readonly unless --execute):
 *   --discover     Full read-only inventory (AR-6 DR-1..DR-6)
 *   --dry-run      Simulate backfill plan (no writes)
 *   --execute      Apply backfill (requires EXEC_4_CONFIRM=YES + launch DB)
 *   --validate     Post-execution checks
 *
 * Usage:
 *   DATABASE_URL='<gateway01/mineuqr-url>' node scripts/exec-4-commercial-authority-backfill.mjs --discover
 *   DATABASE_URL='<gateway01/mineuqr-url>' node scripts/exec-4-commercial-authority-backfill.mjs --dry-run
 *   DATABASE_URL='<gateway01/mineuqr-url>' EXEC_4_CONFIRM=YES node scripts/exec-4-commercial-authority-backfill.mjs --execute
 *   DATABASE_URL='<gateway01/mineuqr-url>' node scripts/exec-4-commercial-authority-backfill.mjs --validate
 *
 * Do NOT use workspace .env Monu URL (gateway05 / fcy9…).
 */
import fs from "node:fs";
import path from "node:path";
import {
  auditConnectionTarget,
  createAuditReadonlyConnection,
  parseDatabaseUrl,
  resolveTlsForHost,
} from "./lib/tidb-audit-connection.mjs";
import {
  buildBackfillPlan,
  LAUNCH_REQUIRED_DB,
  LAUNCH_REQUIRED_HOST,
  planLabel,
  PROTECTED_OWNER_IDS,
  subscriptionEntitledNow,
  validateExecutionTarget,
} from "./lib/exec4-backfill-logic.mjs";
import mysql from "mysql2/promise";

const MODES = ["discover", "dry-run", "execute", "validate", "fixture-dry-run"];

/** DATA-INTEGRITY-1 Phase E / AR-6 launch DB snapshot (readonly archive). */
const LAUNCH_FIXTURE = {
  users: [
    { id: 1, role: "admin", createdAt: "2026-04-01T19:12:37.000Z" },
    { id: 14760004, role: "user", createdAt: "2026-06-07T16:45:56.000Z" },
  ],
  subscriptions: [
    {
      id: 600001,
      userId: 1,
      restaurantId: 720007,
      planId: 30001,
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: "2026-04-01T19:12:37.000Z",
      currentPeriodEnd: "2027-04-01T19:12:37.000Z",
      trialEndsAt: null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      canceledAt: null,
      createdAt: "2026-04-01T19:12:37.000Z",
      updatedAt: "2026-04-01T19:12:37.000Z",
    },
    {
      id: 600002,
      userId: 14760004,
      restaurantId: 720006,
      planId: 30002,
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: "2026-06-07T16:45:56.000Z",
      currentPeriodEnd: "2027-06-07T16:45:56.000Z",
      trialEndsAt: null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      canceledAt: null,
      createdAt: "2026-06-07T16:45:56.000Z",
      updatedAt: "2026-06-07T16:45:56.000Z",
    },
    {
      id: 630001,
      userId: 14760004,
      restaurantId: 720003,
      planId: 30001,
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: "2026-06-07T16:45:56.000Z",
      currentPeriodEnd: "2027-06-07T16:45:56.000Z",
      trialEndsAt: null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      canceledAt: null,
      createdAt: "2026-06-07T16:46:00.000Z",
      updatedAt: "2026-06-07T16:46:00.000Z",
    },
    {
      id: 630002,
      userId: 14760004,
      restaurantId: 720005,
      planId: 30001,
      status: "active",
      billingCycle: "monthly",
      currentPeriodStart: "2026-06-07T16:45:56.000Z",
      currentPeriodEnd: "2027-06-07T16:45:56.000Z",
      trialEndsAt: null,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      canceledAt: null,
      createdAt: "2026-06-07T16:46:01.000Z",
      updatedAt: "2026-06-07T16:46:01.000Z",
    },
  ],
  invoices: [{ id: 1, userId: 1, subscriptionId: 600001, restaurantId: 720007, planId: 30001, status: "active" }],
  counts: {
    users: 2,
    subscriptions: 4,
    accountScopedRows: 0,
    restaurantScopedRows: 4,
    invoices: 1,
    orphanOwnerMismatch: 0,
  },
};
const EXEC_CONFIRM_ENV = "EXEC_4_CONFIRM";

function parseArgs(argv) {
  const flags = argv.filter((a) => a.startsWith("--"));
  const mode = flags.find((f) => MODES.includes(f.slice(2)));
  return {
    mode: mode ? mode.slice(2) : null,
    archive: flags.includes("--archive"),
    help: flags.includes("--help") || flags.includes("-h"),
  };
}

async function createConnection(databaseUrl, { writable = false } = {}) {
  const cfg = parseDatabaseUrl(databaseUrl);
  const ssl = resolveTlsForHost(cfg);
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(ssl ? { ssl } : {}),
    multipleStatements: writable,
  });
}

async function query(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function runDiscovery(conn, target) {
  const subscriptions = await query(
    conn,
    `SELECT id, userId, restaurantId, planId, status, billingCycle,
            currentPeriodStart, currentPeriodEnd, trialEndsAt,
            stripeSubscriptionId, stripeCustomerId, canceledAt,
            createdAt, updatedAt
     FROM user_subscriptions
     ORDER BY userId, id`
  );

  const users = await query(conn, "SELECT id, role, createdAt FROM users ORDER BY id");

  const accountRowCount = (
    await query(conn, "SELECT COUNT(*) AS c FROM user_subscriptions WHERE restaurantId = 0")
  )[0].c;

  const invoices = await query(
    conn,
    `SELECT i.id, i.userId, i.subscriptionId, s.restaurantId, s.planId, s.status
     FROM invoices i
     LEFT JOIN user_subscriptions s ON s.id = i.subscriptionId`
  );

  const renewalCounts = await query(
    conn,
    `SELECT subscriptionId, COUNT(*) AS c
     FROM renewal_notifications
     GROUP BY subscriptionId
     ORDER BY subscriptionId`
  );

  const orphanOwnerMismatch = await query(
    conn,
    `SELECT s.id, s.userId, s.restaurantId, r.userId AS restaurant_owner
     FROM user_subscriptions s
     LEFT JOIN restaurants r ON r.id = s.restaurantId
     WHERE s.restaurantId > 0 AND (r.id IS NULL OR r.userId != s.userId)`
  );

  const planCatalog = await query(
    conn,
    "SELECT id, nameEn, priceMonthly, priceYearly FROM subscription_plans ORDER BY id"
  );

  const restaurantsByUser = await query(
    conn,
    "SELECT userId, COUNT(*) AS cnt FROM restaurants GROUP BY userId ORDER BY userId"
  );

  return {
    phase: "EXEC-4A_DISCOVERY",
    generatedAt: new Date().toISOString(),
    connectionTarget: target,
    counts: {
      users: users.length,
      subscriptions: subscriptions.length,
      accountScopedRows: Number(accountRowCount),
      restaurantScopedRows: subscriptions.filter((s) => s.restaurantId > 0).length,
      invoices: invoices.length,
      orphanOwnerMismatch: orphanOwnerMismatch.length,
    },
    users,
    subscriptions: subscriptions.map((s) => ({
      ...s,
      plan: planLabel(s.planId),
    })),
    invoices,
    renewalNotificationCounts: renewalCounts,
    orphanOwnerMismatch,
    planCatalog,
    restaurantsByUser,
  };
}

function archiveReport(filename, payload) {
  const dir = path.join("docs", "commercial-audit", "executions");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}

async function executeHA(conn, plan, log) {
  const winnerId = plan.winner.id;
  const ownerId = plan.ownerId;
  const scopedRestaurantId = plan.before.rows[0]?.restaurantId;
  if (scopedRestaurantId == null) {
    throw new Error(`H-A plan missing scoped restaurantId for owner ${ownerId}`);
  }

  const [result] = await conn.query(
    `UPDATE user_subscriptions
     SET restaurantId = 0, updatedAt = UTC_TIMESTAMP()
     WHERE id = ? AND userId = ? AND restaurantId = ?
       AND NOT EXISTS (
         SELECT 1 FROM user_subscriptions a
         WHERE a.userId = ? AND a.restaurantId = 0 AND a.id != ?
       )`,
    [winnerId, ownerId, scopedRestaurantId, ownerId, winnerId]
  );

  log.push({
    ownerId,
    mechanism: "R3-A",
    action: "UPDATE_IN_PLACE",
    subscriptionId: winnerId,
    affectedRows: result.affectedRows,
  });
  return result.affectedRows;
}

async function executeHC(conn, plan, log) {
  const ownerId = plan.ownerId;
  const winnerId = plan.winner.id;
  const expireIds = plan.before.rows.map((r) => r.id);

  const existingAccount = await query(
    conn,
    `SELECT id, status, planId FROM user_subscriptions
     WHERE userId = ? AND restaurantId = 0
     ORDER BY id DESC LIMIT 1`,
    [ownerId]
  );

  if (existingAccount.length > 0 && subscriptionEntitledNow(existingAccount[0])) {
    log.push({
      ownerId,
      mechanism: "R3-B",
      action: "SKIP_ALREADY_HAS_ACCOUNT",
      existingAccountId: existingAccount[0].id,
    });
    return { inserted: 0, expired: 0 };
  }

  const [insertResult] = await conn.query(
    `INSERT INTO user_subscriptions (
       userId, restaurantId, planId, status, billingCycle,
       stripeSubscriptionId, stripeCustomerId,
       currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt,
       createdAt, updatedAt
     )
     SELECT userId, 0, planId, status, billingCycle,
            stripeSubscriptionId, stripeCustomerId,
            currentPeriodStart, currentPeriodEnd, trialEndsAt, canceledAt,
            UTC_TIMESTAMP(), UTC_TIMESTAMP()
     FROM user_subscriptions
     WHERE id = ? AND userId = ?
       AND NOT EXISTS (
         SELECT 1 FROM user_subscriptions a
         WHERE a.userId = ? AND a.restaurantId = 0
           AND a.status IN ('active', 'trial')
       )`,
    [winnerId, ownerId, ownerId]
  );

  const newId = insertResult.insertId;

  const [expireResult] = await conn.query(
    `UPDATE user_subscriptions
     SET status = 'expired', updatedAt = UTC_TIMESTAMP()
     WHERE userId = ? AND restaurantId > 0 AND status IN ('active', 'trial')
       AND id IN (${expireIds.map(() => "?").join(",")})`,
    [ownerId, ...expireIds]
  );

  log.push({
    ownerId,
    mechanism: "R3-B",
    action: "INSERT_ACCOUNT_EXPIRE_SCOPED",
    winnerSourceId: winnerId,
    newAccountId: newId,
    expireIds,
    inserted: insertResult.affectedRows,
    expired: expireResult.affectedRows,
  });

  return { inserted: insertResult.affectedRows, expired: expireResult.affectedRows };
}

async function runExecute(conn, dryRunPlan) {
  const log = [];
  const ordered = [...dryRunPlan.plans].sort((a, b) => {
    const order = { "UPDATE_IN_PLACE": 0, "INSERT_ACCOUNT_EXPIRE_SCOPED": 1 };
    return (order[a.action] ?? 9) - (order[b.action] ?? 9);
  });

  await conn.beginTransaction();
  try {
    for (const plan of ordered) {
      if (plan.action === "SKIP" || plan.action === "REVIEW") {
        log.push({ ownerId: plan.ownerId, action: plan.action, reason: plan.skipReason });
        continue;
      }
      if (plan.mechanism === "R3-A") {
        await executeHA(conn, plan, log);
      } else if (plan.mechanism === "R3-B") {
        await executeHC(conn, plan, log);
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  return {
    phase: "EXEC-4D_EXECUTION",
    generatedAt: new Date().toISOString(),
    protectedOwners: PROTECTED_OWNER_IDS,
    log,
  };
}

async function runValidate(conn) {
  const subscriptions = await query(
    conn,
    `SELECT id, userId, restaurantId, planId, status FROM user_subscriptions ORDER BY userId, id`
  );
  const users = await query(conn, "SELECT id, role FROM users ORDER BY id");
  const plan = buildBackfillPlan({ subscriptions, users });

  const accountRows = subscriptions.filter((s) => s.restaurantId === 0);
  const activeScoped = subscriptions.filter(
    (s) => s.restaurantId > 0 && (s.status === "active" || s.status === "trial")
  );

  const perOwner = [];
  for (const user of users) {
    const ownerSubs = subscriptions.filter((s) => s.userId === user.id);
    const account = ownerSubs.filter((s) => s.restaurantId === 0);
    const entitledAccount = account.filter((s) => subscriptionEntitledNow(s));
    perOwner.push({
      ownerId: user.id,
      role: user.role,
      accountRowCount: account.length,
      entitledAccountCount: entitledAccount.length,
      activeScopedCount: ownerSubs.filter(
        (s) => s.restaurantId > 0 && (s.status === "active" || s.status === "trial")
      ).length,
      canonicalPlan:
        user.role === "admin"
          ? "ADMIN (role bypass — CRS uses admin plan)"
          : entitledAccount[0]
            ? planLabel(entitledAccount[0].planId)
            : "NONE",
      crsExpectation:
        user.role === "admin"
          ? "ADMIN via role bypass"
          : entitledAccount.length > 0
            ? planLabel(entitledAccount[0].planId)
            : "NONE",
    });
  }

  const pass =
    accountRows.filter((s) => subscriptionEntitledNow(s)).length >= 1 &&
    perOwner.find((p) => p.ownerId === 14760004)?.entitledAccountCount >= 1;

  return {
    phase: "EXEC-4E_POST_VALIDATION",
    generatedAt: new Date().toISOString(),
    pass,
    metrics: {
      totalAccountRows: accountRows.length,
      entitledAccountRows: accountRows.filter((s) => subscriptionEntitledNow(s)).length,
      activeScopedRowsRemaining: activeScoped.length,
    },
    perOwner,
    remainingWork: plan.plans.filter((p) => p.action !== "SKIP"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.mode) {
    console.log(`Usage: DATABASE_URL=... node scripts/exec-4-commercial-authority-backfill.mjs --<${MODES.join("|")}> [--archive]`);
    process.exit(args.help ? 0 : 1);
  }

  if (args.mode === "fixture-dry-run") {
    const discovery = {
      phase: "EXEC-4A_DISCOVERY_FIXTURE",
      generatedAt: new Date().toISOString(),
      connectionTarget: {
        host: LAUNCH_REQUIRED_HOST,
        database: LAUNCH_REQUIRED_DB,
        source: "DATA-INTEGRITY-1_PHASE_E_ARCHIVE",
      },
      counts: LAUNCH_FIXTURE.counts,
      users: LAUNCH_FIXTURE.users,
      subscriptions: LAUNCH_FIXTURE.subscriptions.map((s) => ({
        ...s,
        plan: planLabel(s.planId),
      })),
      invoices: LAUNCH_FIXTURE.invoices,
    };
    const plan = buildBackfillPlan({
      subscriptions: LAUNCH_FIXTURE.subscriptions,
      users: LAUNCH_FIXTURE.users,
    });
    const report = {
      phase: "EXEC-4B_DRY_RUN_FIXTURE",
      generatedAt: new Date().toISOString(),
      discoveryCounts: discovery.counts,
      invoices: discovery.invoices,
      plan,
      validationDecision: assessSafety(discovery, plan),
    };
    if (args.archive) {
      const file = archiveReport(`EXEC-4-DRY-RUN-${report.generatedAt.slice(0, 10)}.json`, report);
      report.archivedTo = file;
    }
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(JSON.stringify({ status: "ABORTED", reason: "DATABASE_URL required" }));
    process.exit(1);
  }

  const target = auditConnectionTarget(url);
  const targetCheck = validateExecutionTarget(target);

  if (args.mode === "execute" && !targetCheck.ok) {
    console.error(JSON.stringify({ status: "ABORTED", reason: "EXECUTE_REQUIRES_LAUNCH_DB", ...targetCheck }, null, 2));
    process.exit(2);
  }

  if (args.mode === "execute" && process.env[EXEC_CONFIRM_ENV] !== "YES") {
    console.error(
      JSON.stringify({
        status: "ABORTED",
        reason: "EXEC_4_CONFIRM_REQUIRED",
        hint: `${EXEC_CONFIRM_ENV}=YES required for --execute`,
      })
    );
    process.exit(3);
  }

  const conn =
    args.mode === "execute"
      ? await createConnection(url, { writable: true })
      : await createAuditReadonlyConnection(url);

  try {
    if (args.mode === "discover") {
      const report = await runDiscovery(conn, target);
      if (args.archive) {
        const file = archiveReport(`EXEC-4-DISCOVERY-${report.generatedAt.slice(0, 10)}.json`, report);
        report.archivedTo = file;
      }
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (args.mode === "dry-run") {
      const discovery = await runDiscovery(conn, target);
      const plan = buildBackfillPlan({
        subscriptions: discovery.subscriptions,
        users: discovery.users,
      });
      const report = {
        phase: "EXEC-4B_DRY_RUN",
        generatedAt: new Date().toISOString(),
        connectionTarget: target,
        discoveryCounts: discovery.counts,
        invoices: discovery.invoices,
        plan,
        validationDecision: assessSafety(discovery, plan),
      };
      if (args.archive) {
        const file = archiveReport(`EXEC-4-DRY-RUN-${report.generatedAt.slice(0, 10)}.json`, report);
        report.archivedTo = file;
      }
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (args.mode === "execute") {
      const discovery = await runDiscovery(conn, target);
      const plan = buildBackfillPlan({
        subscriptions: discovery.subscriptions,
        users: discovery.users,
      });
      const safety = assessSafety(discovery, plan);
      if (!safety.safeToExecute) {
        console.error(JSON.stringify({ status: "ABORTED", reason: "NOT_SAFE", safety }, null, 2));
        process.exit(4);
      }
      const execution = await runExecute(conn, plan);
      const report = {
        phase: "EXEC-4D_EXECUTION_COMPLETE",
        generatedAt: new Date().toISOString(),
        connectionTarget: target,
        preDiscovery: discovery.counts,
        planSummary: plan.summary,
        safety,
        execution,
      };
      if (args.archive) {
        const file = archiveReport(`EXEC-4-EXECUTION-${report.generatedAt.slice(0, 10)}.json`, report);
        report.archivedTo = file;
      }
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (args.mode === "validate") {
      const report = await runValidate(conn);
      if (args.archive) {
        const file = archiveReport(`EXEC-4-VALIDATION-${report.generatedAt.slice(0, 10)}.json`, report);
        report.archivedTo = file;
      }
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.pass ? 0 : 5);
    }
  } finally {
    await conn.end();
  }
}

function assessSafety(discovery, plan) {
  const risks = [];
  if (discovery.counts.orphanOwnerMismatch > 0) {
    risks.push("ORPHAN_OWNER_MISMATCH");
  }
  if (plan.summary.review > 0) {
    risks.push("COHORT_REQUIRES_MANUAL_REVIEW");
  }
  const actionable = plan.plans.filter(
    (p) => p.action === "UPDATE_IN_PLACE" || p.action === "INSERT_ACCOUNT_EXPIRE_SCOPED"
  );
  if (actionable.length === 0 && discovery.counts.accountScopedRows === 0) {
    risks.push("NO_ACTIONABLE_PLANS");
  }
  if (discovery.counts.accountScopedRows > 0 && actionable.length > 0) {
    risks.push("PARTIAL_ACCOUNT_ROWS_EXIST");
  }

  const user14760004 = plan.plans.find((p) => p.ownerId === 14760004);
  if (user14760004?.after?.expectedPlan !== "PROFESSIONAL") {
    risks.push("USER_14760004_PLAN_NOT_PROFESSIONAL");
  }

  const user1 = plan.plans.find((p) => p.ownerId === 1);
  if (user1 && user1.action !== "UPDATE_IN_PLACE" && user1.action !== "SKIP") {
    risks.push("ADMIN_USER_1_UNEXPECTED_ACTION");
  }

  const safeToExecute =
    risks.filter(
      (r) =>
        !["NO_ACTIONABLE_PLANS"].includes(r) ||
        discovery.counts.accountScopedRows > 0
    ).length === 0 ||
    (risks.length === 0 && actionable.length > 0);

  const finalSafe =
    discovery.counts.orphanOwnerMismatch === 0 &&
    plan.summary.review === 0 &&
    actionable.length >= 1 &&
    !risks.includes("USER_14760004_PLAN_NOT_PROFESSIONAL") &&
    !risks.includes("ADMIN_USER_1_UNEXPECTED_ACTION");

  return {
    safeToExecute: finalSafe,
    decision: finalSafe ? "SAFE TO EXECUTE" : "NOT SAFE TO EXECUTE",
    risks,
    rowsAffected: actionable.reduce((n, p) => n + (p.before?.scopedCount ?? 0), 0),
    rowsCreated: plan.summary.toInsertExpire,
    rowsUpdated: plan.summary.toUpdate,
    duplicateHandling: "H-C: INSERT new account row; expire all scoped (including winner copy)",
    rollbackStrategy: "Full TiDB backup restore (Gate A); no partial rollback",
  };
}

main().catch((e) => {
  console.error(JSON.stringify({ status: "FAILED", error: e.message, stack: e.stack }));
  process.exit(1);
});
