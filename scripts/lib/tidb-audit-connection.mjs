/**
 * AUDIT-TOOLING-1 — TLS-enabled mysql2 connections for readonly audit scripts.
 * Mirrors server/db.ts createRuntimeMysqlPool TLS behavior; audit-only, no Drizzle.
 */
import mysql from "mysql2/promise";

/**
 * Parse DATABASE_URL; mirrors server/db.ts parseDatabaseUrl + apply-session-valid-after-local-patch.cjs.
 * @param {string} databaseUrl
 */
export function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl.replace(/^mysql:\/\//, "http://"));
  const sslRaw = url.searchParams.get("ssl");
  let ssl;
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw);
    } catch {
      ssl = sslRaw;
    }
  }
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl,
  };
}

/**
 * TiDB Serverless requires TLS; mysql2 defaults to ssl:false when URL omits ?ssl=...
 * @param {ReturnType<typeof parseDatabaseUrl>} cfg
 */
export function resolveTlsForHost(cfg) {
  const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host ?? "");
  return (
    cfg.ssl ??
    (isTidbCloud
      ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
      : undefined)
  );
}

/**
 * Readonly audit connection with TiDB Cloud TLS compatibility.
 * @param {string} databaseUrl
 */
export async function createAuditReadonlyConnection(databaseUrl) {
  const cfg = parseDatabaseUrl(databaseUrl);
  const ssl = resolveTlsForHost(cfg);
  return mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(ssl ? { ssl } : {}),
  });
}

/**
 * Redacted target metadata for audit reports.
 * @param {string} databaseUrl
 */
export function auditConnectionTarget(databaseUrl) {
  const cfg = parseDatabaseUrl(databaseUrl);
  return {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    tls: Boolean(resolveTlsForHost(cfg)),
  };
}
