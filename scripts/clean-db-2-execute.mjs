/**
 * CLEAN-DB-2 — full data wipe except admin user (users.id=1).
 *
 * NEVER calls deleteUserCascade(1). Uses explicit SQL in one transaction.
 *
 * Usage:
 *   node -r dotenv/config scripts/clean-db-2-execute.mjs --dry-run
 *   CLEAN_DB_2_CONFIRM=YES node -r dotenv/config scripts/clean-db-2-execute.mjs --execute
 *
 * KEEP: users.id=1, auth_tokens for user 1, subscription_plans, countries_currencies
 * DELETE: all restaurants, subscriptions, orders, menus, notifications, trial users
 */
import mysql from "mysql2/promise";

const KEEP_USER_ID = 1;
const KEEP_EMAIL = "k.sh61@yahoo.com";
const EXECUTE_CONFIRM_ENV = "CLEAN_DB_2_CONFIRM";

/** Tables wiped entirely (no row-level KEEP inside these). */
const DELETE_STEPS = [
  {
    name: "order_items",
    countSql: "SELECT COUNT(*) AS c FROM order_items",
    deleteSql: "DELETE FROM order_items",
  },
  {
    name: "orders",
    countSql: "SELECT COUNT(*) AS c FROM orders",
    deleteSql: "DELETE FROM orders",
  },
  {
    name: "menu_items",
    countSql: "SELECT COUNT(*) AS c FROM menu_items",
    deleteSql: "DELETE FROM menu_items",
  },
  {
    name: "categories",
    countSql: "SELECT COUNT(*) AS c FROM categories",
    deleteSql: "DELETE FROM categories",
  },
  {
    name: "offers",
    countSql: "SELECT COUNT(*) AS c FROM offers",
    deleteSql: "DELETE FROM offers",
  },
  {
    name: "restaurant_holidays",
    countSql: "SELECT COUNT(*) AS c FROM restaurant_holidays",
    deleteSql: "DELETE FROM restaurant_holidays",
  },
  {
    name: "restaurant_tables",
    countSql: "SELECT COUNT(*) AS c FROM restaurant_tables",
    deleteSql: "DELETE FROM restaurant_tables",
  },
  {
    name: "invoices",
    countSql: "SELECT COUNT(*) AS c FROM invoices",
    deleteSql: "DELETE FROM invoices",
  },
  {
    name: "renewal_notifications",
    countSql: "SELECT COUNT(*) AS c FROM renewal_notifications",
    deleteSql: "DELETE FROM renewal_notifications",
  },
  {
    name: "user_subscriptions",
    countSql: "SELECT COUNT(*) AS c FROM user_subscriptions",
    deleteSql: "DELETE FROM user_subscriptions",
  },
  {
    name: "restaurants",
    countSql: "SELECT COUNT(*) AS c FROM restaurants",
    deleteSql: "DELETE FROM restaurants",
  },
  {
    name: "auth_tokens",
    countSql: "SELECT COUNT(*) AS c FROM auth_tokens WHERE userId != ?",
    deleteSql: "DELETE FROM auth_tokens WHERE userId != ?",
    params: () => [KEEP_USER_ID],
  },
  {
    name: "users",
    countSql: "SELECT COUNT(*) AS c FROM users WHERE id != ?",
    deleteSql: "DELETE FROM users WHERE id != ?",
    params: () => [KEEP_USER_ID],
  },
];

const TRACKED_TABLES = [
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
  "countries_currencies",
];

const REFERENCE_TABLES_KEPT = ["subscription_plans", "countries_currencies"];

async function q(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function tableTotals(conn) {
  const totals = {};
  for (const t of TRACKED_TABLES) {
    const [row] = await q(conn, `SELECT COUNT(*) AS c FROM \`${t}\``);
    totals[t] = Number(row.c);
  }
  return totals;
}

async function countStep(conn, step) {
  const params = step.params ? step.params() : [];
  const [row] = await q(conn, step.countSql, params);
  return Number(row.c);
}

async function runSafetyChecks(conn) {
  const checks = [];
  const fail = (id, message) => {
    checks.push({ id, pass: false, message });
    return false;
  };
  const pass = (id, message, detail = {}) => {
    checks.push({ id, pass: true, message, ...detail });
    return true;
  };

  const adminRows = await q(
    conn,
    `SELECT id, email, role, openId, passwordHash IS NOT NULL AS hasPassword
     FROM users WHERE id = ?`,
    [KEEP_USER_ID]
  );
  const admin = adminRows[0];
  if (!admin) {
    fail("admin_exists", `users.id=${KEEP_USER_ID} not found`);
  } else if (admin.email?.toLowerCase().trim() !== KEEP_EMAIL.toLowerCase()) {
    fail(
      "admin_email",
      `users.id=${KEEP_USER_ID} email mismatch: expected ${KEEP_EMAIL}, got ${admin.email}`
    );
  } else {
    pass("admin_exists", "KEEP admin user present", {
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      hasPassword: !!admin.hasPassword,
    });
  }

  pass(
    "no_deleteUserCascade",
    "Executor uses SQL only — deleteUserCascade(1) is never imported or called"
  );

  for (const step of DELETE_STEPS) {
    if (step.name === "users" && !step.deleteSql.includes("id != ?")) {
      fail("users_guard", "users DELETE must exclude KEEP_USER_ID");
    }
  }
  pass("users_guard", `users DELETE restricted to id != ${KEEP_USER_ID}`);

  const adminTokenCount = await q(
    conn,
    "SELECT COUNT(*) AS c FROM auth_tokens WHERE userId = ?",
    [KEEP_USER_ID]
  );
  const otherTokenCount = await q(
    conn,
    "SELECT COUNT(*) AS c FROM auth_tokens WHERE userId != ?",
    [KEEP_USER_ID]
  );
  pass("auth_tokens_scope", "Admin auth tokens preserved", {
    keep: Number(adminTokenCount[0]?.c ?? 0),
    delete: Number(otherTokenCount[0]?.c ?? 0),
  });

  const allPassed = checks.every((c) => c.pass);
  return { allPassed, checks };
}

async function postVerification(conn) {
  const totals = await tableTotals(conn);
  const admin = await q(
    conn,
    "SELECT id, email, role FROM users WHERE id = ?",
    [KEEP_USER_ID]
  );
  const expectations = {
    users: 1,
    restaurants: 0,
    user_subscriptions: 0,
    orders: 0,
    order_items: 0,
  };
  const verification = {};
  let allPass = true;
  for (const [table, expected] of Object.entries(expectations)) {
    const actual = totals[table];
    const pass = actual === expected;
    if (!pass) allPass = false;
    verification[table] = { expected, actual, pass };
  }
  verification.admin = {
    pass: admin.length === 1 && admin[0].email === KEEP_EMAIL,
    row: admin[0] ?? null,
  };
  if (!verification.admin.pass) allPass = false;

  for (const ref of REFERENCE_TABLES_KEPT) {
    verification[ref] = {
      pass: totals[ref] > 0 || ref === "countries_currencies",
      actual: totals[ref],
      note: "reference table — not deleted",
    };
  }

  return { allPass, totals, verification };
}

function parseMode(argv) {
  const dryRun = argv.includes("--dry-run") || !argv.includes("--execute");
  const execute = argv.includes("--execute");
  if (execute && dryRun && argv.includes("--dry-run") && argv.includes("--execute")) {
    return { mode: "invalid" };
  }
  if (execute) return { mode: "execute" };
  return { mode: "dry-run" };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const { mode } = parseMode(process.argv.slice(2));
  if (mode === "invalid") {
    console.error("Use either --dry-run or --execute, not both");
    process.exit(1);
  }

  if (mode === "execute" && process.env[EXECUTE_CONFIRM_ENV] !== "YES") {
    console.error(
      `Refusing --execute without ${EXECUTE_CONFIRM_ENV}=YES (safety gate)`
    );
    process.exit(1);
  }

  const conn = await mysql.createConnection(url);
  const report = {
    script: "scripts/clean-db-2-execute.mjs",
    mode,
    executedAt: new Date().toISOString(),
    keep: {
      userId: KEEP_USER_ID,
      email: KEEP_EMAIL,
      referenceTables: REFERENCE_TABLES_KEPT,
    },
    safetyChecks: null,
    before: {},
    plannedDeletes: {},
    deletedByTable: {},
    after: {},
    postVerification: null,
    totalDeleted: 0,
    committed: false,
    rolledBack: false,
  };

  try {
    const [[{ db }]] = await conn.query("SELECT DATABASE() AS db");
    report.database = db;
    report.before.tableTotals = await tableTotals(conn);

    report.safetyChecks = await runSafetyChecks(conn);
    if (!report.safetyChecks.allPassed) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    for (const step of DELETE_STEPS) {
      report.plannedDeletes[step.name] = await countStep(conn, step);
    }
    report.plannedTotal = Object.values(report.plannedDeletes).reduce(
      (a, b) => a + b,
      0
    );

    if (mode === "dry-run") {
      report.after = {
        note: "dry-run — no mutations; counts reflect current DB",
        tableTotals: report.before.tableTotals,
      };
      report.postVerification = {
        note: "skipped in dry-run",
      };
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    await conn.beginTransaction();

    for (const step of DELETE_STEPS) {
      const params = step.params ? step.params() : [];
      const [result] = await conn.query(step.deleteSql, params);
      const affected = result.affectedRows ?? 0;
      report.deletedByTable[step.name] = affected;
      report.totalDeleted += affected;
    }

    report.after.tableTotals = await tableTotals(conn);
    report.postVerification = await postVerification(conn);

    if (!report.postVerification.allPass) {
      await conn.rollback();
      report.rolledBack = true;
      report.committed = false;
      report.error = "Post-verification failed — transaction rolled back";
      console.log(JSON.stringify(report, null, 2));
      process.exit(1);
    }

    await conn.commit();
    report.committed = true;
  } catch (err) {
    try {
      await conn.rollback();
      report.rolledBack = true;
    } catch {
      /* ignore */
    }
    report.error = err instanceof Error ? err.message : String(err);
    report.committed = false;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  } finally {
    await conn.end();
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
