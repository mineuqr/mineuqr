/**
 * COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1
 * Isolated TiDB Cloud branch mineuqr-stagIn for occupancy concurrency.
 * Connects only via G07_DATABASE_URL / TIDB_TEST_DATABASE_URL.
 * Parses DATABASE_URL solely to refuse Production main (never createPool on it).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPool, type Pool, type PoolOptions } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import {
  parseDatabaseUrl,
  resolveTlsForHost,
} from "../../../scripts/lib/tidb-audit-connection.mjs";

export const G07_URL_ENV_KEYS = [
  "G07_DATABASE_URL",
  "TIDB_TEST_DATABASE_URL",
] as const;

const PRODUCTION_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";

export const G07_SCOPE_A = 970701;
export const G07_SCOPE_B = 970702;
export const G07_SCOPE_KEYS = 970703;

export const G07_EXPECTED_BRANCH = "mineuqr-stagIn";

export type G07TidbIdentity = {
  sourceEnvKey: string;
  host: string;
  port: number;
  database: string;
  userPrefix: string;
  isTidbCloud: boolean;
  tls: boolean;
  isExactProductionHost: boolean;
  sameSqlUserAsProductionMain: boolean;
  expectedBranch: string;
  verdict: "ACCEPT_NON_PRODUCTION" | "REJECT_PRODUCTION" | "REJECT_NOT_TIDB_CLOUD";
};

export type G07EngineSnapshot = {
  version: string;
  database: string;
  currentUserPrefix: string;
  autocommit: unknown;
  transactionIsolation: unknown;
  tidbTxnMode: unknown;
  tidbLockWaitTimeout: unknown;
};

export type OccupancyTestTidb = {
  identity: G07TidbIdentity;
  engine: G07EngineSnapshot;
  lockTable: {
    existsBefore: boolean;
    applied0094: boolean;
    primaryKey: string | null;
  };
  db: ReturnType<typeof drizzle>;
  pool: Pool;
  poolB: Pool;
  dbB: ReturnType<typeof drizzle>;
  stop: () => Promise<void>;
};

function userPrefix(user: string): string {
  const at = user.indexOf(".");
  return at === -1 ? user : user.slice(0, at);
}

function classify(
  sourceEnvKey: string,
  databaseUrl: string,
  productionUrl?: string | null
): G07TidbIdentity {
  const cfg = parseDatabaseUrl(databaseUrl);
  const host = (cfg.host ?? "").toLowerCase();
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  const isExactProductionHost = host === PRODUCTION_HOST;
  const prefix = userPrefix(cfg.user ?? "");
  let sameSqlUserAsProductionMain = false;
  if (productionUrl) {
    const prod = parseDatabaseUrl(productionUrl);
    sameSqlUserAsProductionMain =
      (cfg.host ?? "").toLowerCase() === (prod.host ?? "").toLowerCase() &&
      (cfg.user ?? "") === (prod.user ?? "");
  }
  let verdict: G07TidbIdentity["verdict"] = "ACCEPT_NON_PRODUCTION";
  if (!isTidbCloud) verdict = "REJECT_NOT_TIDB_CLOUD";
  // Branch DB name may still be mineuqr. Main is the Production SQL user on the main host.
  if (sameSqlUserAsProductionMain) verdict = "REJECT_PRODUCTION";
  return {
    sourceEnvKey,
    host: cfg.host ?? "",
    port: Number(cfg.port ?? 0),
    database: cfg.database ?? "",
    userPrefix: prefix,
    isTidbCloud,
    tls: Boolean(resolveTlsForHost(cfg)),
    isExactProductionHost,
    sameSqlUserAsProductionMain,
    expectedBranch: G07_EXPECTED_BRANCH,
    verdict,
  };
}

export function readG07DatabaseUrl(): { key: string; url: string } | null {
  for (const key of G07_URL_ENV_KEYS) {
    const url = process.env[key]?.trim();
    if (url) return { key, url };
  }
  return null;
}

export function classifyG07DatabaseUrl(
  sourceEnvKey: string,
  databaseUrl: string,
  productionUrl?: string | null
): G07TidbIdentity {
  return classify(sourceEnvKey, databaseUrl, productionUrl);
}

export function assertNonProductionTidb(identity: G07TidbIdentity): void {
  if (identity.verdict === "REJECT_PRODUCTION") {
    throw new Error(
      "G-07 STOP: target is Production main (same host + SQL user as DATABASE_URL). Use the mineuqr-stagIn branch connection string in G07_DATABASE_URL."
    );
  }
  if (identity.verdict === "REJECT_NOT_TIDB_CLOUD") {
    throw new Error(
      "G-07 STOP: target is not TiDB Cloud. Do not substitute MySQL 8."
    );
  }
}

function poolOptions(databaseUrl: string): PoolOptions {
  const cfg = parseDatabaseUrl(databaseUrl);
  const ssl = resolveTlsForHost(cfg);
  return {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 8,
    enableKeepAlive: true,
    ...(ssl ? { ssl } : {}),
  };
}

async function q(pool: Pool, sql: string, params?: unknown[]) {
  const [rows] = params
    ? await pool.promise().query(sql, params)
    : await pool.promise().query(sql);
  return rows as Record<string, unknown>[];
}

async function scalar(
  pool: Pool,
  sql: string
): Promise<unknown> {
  try {
    const rows = await q(pool, sql);
    const row = rows[0] ?? {};
    return Object.values(row)[0];
  } catch {
    return null;
  }
}

export async function startOccupancyTestTidb(): Promise<OccupancyTestTidb> {
  const supplied = readG07DatabaseUrl();
  if (!supplied) {
    throw new Error(
      "G-07 STOP: set G07_DATABASE_URL or TIDB_TEST_DATABASE_URL in the process environment. Do not use DATABASE_URL (Production)."
    );
  }
  const identity = classify(
    supplied.key,
    supplied.url,
    process.env.DATABASE_URL
  );
  assertNonProductionTidb(identity);

  const pool = createPool(poolOptions(supplied.url));
  const poolB = createPool(poolOptions(supplied.url));
  try {
    await q(pool, "SELECT 1");
    await q(poolB, "SELECT 1");
  } catch (error) {
    pool.end();
    poolB.end();
    throw error;
  }

  const version = String((await scalar(pool, "SELECT VERSION()")) ?? "");
  if (!/tidb/i.test(version)) {
    pool.end();
    poolB.end();
    throw new Error(
      `G-07 STOP: VERSION() is not TiDB (${version || "empty"}). MySQL 8 substitution is prohibited.`
    );
  }

  const currentUser = String((await scalar(pool, "SELECT CURRENT_USER()")) ?? "");
  const connectedPrefix = userPrefix(currentUser.split("@")[0] ?? "");
  const engine: G07EngineSnapshot = {
    version,
    database: String((await scalar(pool, "SELECT DATABASE()")) ?? ""),
    currentUserPrefix: connectedPrefix,
    autocommit: await scalar(pool, "SELECT @@autocommit"),
    transactionIsolation:
      (await scalar(pool, "SELECT @@transaction_isolation")) ??
      (await scalar(pool, "SELECT @@tx_isolation")),
    tidbTxnMode: await scalar(pool, "SELECT @@tidb_txn_mode"),
    tidbLockWaitTimeout: await scalar(pool, "SELECT @@tidb_lock_wait_timeout"),
  };

  const productionUrl = process.env.DATABASE_URL;
  if (productionUrl) {
    const prodPrefix = userPrefix(parseDatabaseUrl(productionUrl).user ?? "");
    if (identity.isExactProductionHost && connectedPrefix === prodPrefix) {
      pool.end();
      poolB.end();
      throw new Error(
        "G-07 STOP: session SQL user matches Production main. Not mineuqr-stagIn."
      );
    }
  }

  const existedRows = await q(
    pool,
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'commercial_limit_occupancy_locks'`
  );
  const existsBefore = existedRows.length > 0;
  let applied0094 = false;
  if (!existsBefore) {
    const sqlPath = resolve(
      process.cwd(),
      "drizzle/0094_commercial_limit_occupancy_locks.sql"
    );
    const ddl = readFileSync(sqlPath, "utf8");
    await pool.promise().query(ddl);
    applied0094 = true;
  }

  const pkRows = await q(
    pool,
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'commercial_limit_occupancy_locks'
       AND INDEX_NAME = 'PRIMARY'
     GROUP BY INDEX_NAME`
  );
  const primaryKey = String(pkRows[0]?.cols ?? "") || null;
  if (primaryKey !== "scopeKind,scopeId,limitKey") {
    pool.end();
    poolB.end();
    throw new Error(
      `G-07 STOP: commercial_limit_occupancy_locks PRIMARY KEY is ${primaryKey ?? "missing"}`
    );
  }

  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_g07_resources (
      id int NOT NULL AUTO_INCREMENT,
      scopeKind varchar(16) NOT NULL,
      scopeId int NOT NULL,
      limitKey varchar(128) NOT NULL,
      PRIMARY KEY (id),
      KEY occupancy_g07_resources_scope (scopeKind, scopeId, limitKey)
    )
  `);
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_g07_terminals (
      id int NOT NULL AUTO_INCREMENT,
      scopeId int NOT NULL,
      provisioned tinyint NOT NULL DEFAULT 1,
      replacedById int NULL,
      PRIMARY KEY (id),
      KEY occupancy_g07_terminals_scope (scopeId, provisioned)
    )
  `);

  const db = drizzle(pool);
  const dbB = drizzle(poolB);
  return {
    identity,
    engine,
    lockTable: { existsBefore, applied0094, primaryKey },
    db,
    pool,
    poolB,
    dbB,
    stop: async () => {
      pool.end();
      poolB.end();
    },
  };
}

export async function cleanupG07Fixtures(pool: Pool): Promise<void> {
  await pool.promise().query(
    "DELETE FROM occupancy_g07_resources WHERE scopeId IN (?, ?, ?)",
    [G07_SCOPE_A, G07_SCOPE_B, G07_SCOPE_KEYS]
  );
  await pool.promise().query(
    "DELETE FROM occupancy_g07_terminals WHERE scopeId IN (?, ?, ?)",
    [G07_SCOPE_A, G07_SCOPE_B, G07_SCOPE_KEYS]
  );
}
