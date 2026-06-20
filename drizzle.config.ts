import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

/** Parse DATABASE_URL; mirrors server/db.ts TLS handling for drizzle-kit only. */
function parseDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslRaw = url.searchParams.get("ssl");
  let ssl: { minVersion?: string; rejectUnauthorized?: boolean } | undefined;
  if (sslRaw) {
    try {
      ssl = JSON.parse(sslRaw) as { minVersion?: string; rejectUnauthorized?: boolean };
    } catch {
      ssl = undefined;
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

const cfg = parseDatabaseUrl(connectionString);
const isTidbCloud = /\.tidbcloud\.com$/i.test(cfg.host);
const ssl =
  cfg.ssl ??
  (isTidbCloud
    ? ({ minVersion: "TLSv1.2", rejectUnauthorized: true } as const)
    : undefined);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    ...(ssl ? { ssl } : {}),
  },
});
