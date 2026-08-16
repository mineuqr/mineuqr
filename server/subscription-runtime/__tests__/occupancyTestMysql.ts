/**
 * COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1
 * Isolated MySQL for occupancy concurrency. Never uses Production DATABASE_URL.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createPool, type Pool } from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";

const execFileAsync = promisify(execFile);

export const OCCUPANCY_TEST_CONTAINER = "mineuqr-occupancy-test";
const PORT = 3307;
const PASSWORD = "occupancy-test";
const DATABASE = "occupancy_test";

export type OccupancyTestMysql = {
  db: ReturnType<typeof drizzle>;
  pool: Pool;
  stop: () => Promise<void>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dockerAvailable(): Promise<boolean> {
  try {
    await execFileAsync("docker", ["version"], { timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function containerRunning(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["inspect", "-f", "{{.State.Running}}", OCCUPANCY_TEST_CONTAINER],
      { timeout: 15000 }
    );
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

async function startContainer(): Promise<void> {
  try {
    await execFileAsync("docker", ["rm", "-f", OCCUPANCY_TEST_CONTAINER], {
      timeout: 20000,
    });
  } catch {
    /* absent */
  }
  await execFileAsync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      OCCUPANCY_TEST_CONTAINER,
      "-e",
      `MYSQL_ROOT_PASSWORD=${PASSWORD}`,
      "-e",
      `MYSQL_DATABASE=${DATABASE}`,
      "-p",
      `${PORT}:3306`,
      "mysql:8.0",
      "--innodb-lock-wait-timeout=5",
    ],
    { timeout: 120000 }
  );
}

async function waitForMysql(pool: Pool): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 90000) {
    try {
      await pool.promise().query("SELECT 1");
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error("occupancy test mysql did not become ready");
}

export async function startOccupancyTestMysql(): Promise<OccupancyTestMysql | null> {
  if (!(await dockerAvailable())) return null;
  if (!(await containerRunning())) {
    await startContainer();
  }
  const pool = createPool({
    host: "127.0.0.1",
    port: PORT,
    user: "root",
    password: PASSWORD,
    database: DATABASE,
    waitForConnections: true,
    connectionLimit: 8,
  });
  try {
    await waitForMysql(pool);
  } catch (error) {
    pool.end();
    throw error;
  }
  const db = drizzle(pool);
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS commercial_limit_occupancy_locks (
      scopeKind varchar(16) NOT NULL,
      scopeId int NOT NULL,
      limitKey varchar(128) NOT NULL,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (scopeKind, scopeId, limitKey)
    )
  `);
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_test_resources (
      id int NOT NULL AUTO_INCREMENT,
      scopeKind varchar(16) NOT NULL,
      scopeId int NOT NULL,
      PRIMARY KEY (id),
      KEY occupancy_test_scope (scopeKind, scopeId)
    )
  `);
  await pool.promise().query(`
    CREATE TABLE IF NOT EXISTS occupancy_test_terminals (
      id int NOT NULL AUTO_INCREMENT,
      scopeId int NOT NULL,
      provisioned tinyint NOT NULL DEFAULT 1,
      replacedById int NULL,
      PRIMARY KEY (id),
      KEY occupancy_test_terminals_scope (scopeId, provisioned)
    )
  `);
  return {
    db,
    pool,
    stop: async () => {
      pool.end();
    },
  };
}
