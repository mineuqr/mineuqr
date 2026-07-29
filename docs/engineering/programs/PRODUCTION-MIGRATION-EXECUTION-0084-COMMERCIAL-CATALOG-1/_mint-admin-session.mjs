/**
 * PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1
 * Mint a short-lived admin session cookie for Browser UAT (local only).
 * Does not print PII beyond role confirmation. Does not modify business data.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COOKIE_NAME } from "../../../../shared/const.ts";
import { getDb } from "../../../../server/db.ts";
import { users } from "../../../../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import { sdk } from "../../../../server/_core/sdk.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db
    .select({
      id: users.id,
      openId: users.openId,
      role: users.role,
      name: users.name,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  const admin = rows[0];
  if (!admin?.openId) throw new Error("No admin user found for UAT mint");

  const token = await sdk.createSessionToken(admin.openId, {
    expiresInMs: 30 * 60 * 1000,
    name: admin.name || "UAT Admin",
  });

  const out = {
    cookieName: COOKIE_NAME,
    // token for Playwright only — not logged to stdout in full
    cookieValue: token,
    adminId: admin.id,
    role: admin.role,
  };
  writeFileSync(
    resolve(__dirname, "_uat-artifacts/admin-session.json"),
    JSON.stringify(out)
  );
  console.log(
    JSON.stringify({
      ok: true,
      cookieName: COOKIE_NAME,
      adminId: admin.id,
      role: admin.role,
      tokenLength: token.length,
    })
  );
}

main().catch((e) => {
  console.error("MINT_FAIL", e.message);
  process.exit(1);
});
