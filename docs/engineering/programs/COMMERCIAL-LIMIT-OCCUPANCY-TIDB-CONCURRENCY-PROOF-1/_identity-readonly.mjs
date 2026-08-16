/**
 * COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1
 * Identity only. Mutation NONE. Never prints credentials.
 * Drill target: G07_DATABASE_URL / TIDB_TEST_DATABASE_URL (branch mineuqr-stagIn).
 * DATABASE_URL is classified only to prove it is Production main and is not used.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseDatabaseUrl,
  resolveTlsForHost,
} from "../../../../scripts/lib/tidb-audit-connection.mjs";

const PRODUCTION_HOST = "gateway01.eu-central-1.prod.aws.tidbcloud.com";
const EXPECTED_BRANCH = "mineuqr-stagIn";
const KEYS = ["G07_DATABASE_URL", "TIDB_TEST_DATABASE_URL"];

function userPrefix(user) {
  const at = String(user ?? "").indexOf(".");
  return at === -1 ? String(user ?? "") : String(user).slice(0, at);
}

function classify(sourceEnvKey, databaseUrl, productionUrl) {
  const cfg = parseDatabaseUrl(databaseUrl);
  const host = (cfg.host ?? "").toLowerCase();
  const isTidbCloud = /\.tidbcloud\.com$/i.test(host);
  const isExactProductionHost = host === PRODUCTION_HOST;
  let sameSqlUserAsProductionMain = false;
  if (productionUrl) {
    const prod = parseDatabaseUrl(productionUrl);
    sameSqlUserAsProductionMain =
      (cfg.host ?? "").toLowerCase() === (prod.host ?? "").toLowerCase() &&
      (cfg.user ?? "") === (prod.user ?? "");
  }
  let verdict = "ACCEPT_NON_PRODUCTION";
  if (!isTidbCloud) verdict = "REJECT_NOT_TIDB_CLOUD";
  if (sameSqlUserAsProductionMain) verdict = "REJECT_PRODUCTION";
  return {
    sourceEnvKey,
    host: cfg.host ?? "",
    port: cfg.port,
    database: cfg.database ?? "",
    userPrefix: userPrefix(cfg.user ?? ""),
    tls: Boolean(resolveTlsForHost(cfg)),
    isTidbCloud,
    isExactProductionHost,
    sameSqlUserAsProductionMain,
    expectedBranch: EXPECTED_BRANCH,
    expectedDatabase: "mineuqr",
    verdict,
    passwordPresent: Boolean(cfg.password),
    userPresent: Boolean(cfg.user),
  };
}

const g07Key = KEYS.find((key) => process.env[key]?.trim());
const productionUrl = process.env.DATABASE_URL;
const evidence = {
  program: "COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1",
  queriedAt: new Date().toISOString(),
  mutation: "NONE",
  connected: false,
  usedDatabaseUrlEnv: false,
  expectedBranch: EXPECTED_BRANCH,
  expectedParent: "main",
  g07UrlPresent: Boolean(g07Key),
  g07SourceKey: g07Key ?? null,
  g07: g07Key ? classify(g07Key, process.env[g07Key], productionUrl) : null,
  workspaceDatabaseUrl: productionUrl
    ? classify("DATABASE_URL", productionUrl, productionUrl)
    : { present: false },
};

const out = join(dirname(fileURLToPath(import.meta.url)), "_IDENTITY.json");
writeFileSync(out, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ ...evidence, note: "credentials omitted" }, null, 2));

if (!g07Key) {
  console.error(
    "G-07 STOP: required env G07_DATABASE_URL (alias TIDB_TEST_DATABASE_URL) is missing. It must be the TiDB Cloud Connect string for branch mineuqr-stagIn, not Production main DATABASE_URL."
  );
  process.exit(2);
}
if (evidence.g07.verdict !== "ACCEPT_NON_PRODUCTION") {
  console.error(`G-07 STOP: ${evidence.g07.verdict}`);
  process.exit(3);
}
