/**
 * Mint + exit cleanly, then probe auth cookie against running server.
 */
import "dotenv/config";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { COOKIE_NAME } from "../../../../shared/const.ts";
import { getDb } from "../../../../server/db.ts";
import { users } from "../../../../drizzle/schema.ts";
import { eq } from "drizzle-orm";
import { sdk } from "../../../../server/_core/sdk.ts";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionPath = resolve(
  process.cwd(),
  "docs/engineering/programs/PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1/_uat-artifacts/admin-session.json"
);
const BASE = process.env.UAT_BASE_URL || "http://127.0.0.1:3000";

async function mint() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const rows = await db
    .select({ id: users.id, openId: users.openId, role: users.role, name: users.name })
    .from(users)
    .where(eq(users.role, "admin"))
    .limit(1);
  const admin = rows[0];
  if (!admin?.openId) throw new Error("No admin");

  const token = await sdk.createSessionToken(admin.openId, {
    expiresInMs: 30 * 60 * 1000,
    name: admin.name || "UAT Admin",
  });

  // Verify locally before browser
  const verified = await sdk.verifySession(token);
  console.error("[PROBE] verifySession", verified);
  console.error("[PROBE] admin", { id: admin.id, role: admin.role, openIdPrefix: admin.openId.slice(0, 6) });

  writeFileSync(
    sessionPath,
    JSON.stringify({ cookieName: COOKIE_NAME, cookieValue: token, adminId: admin.id, role: admin.role })
  );
  return token;
}

async function probe(token) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    { name: COOKIE_NAME, value: token, url: BASE, httpOnly: true, sameSite: "Lax" },
  ]);
  const page = await context.newPage();

  const cookies = await context.cookies(BASE);
  console.error("[PROBE] cookies", cookies.map((c) => ({ name: c.name, domain: c.domain, path: c.path, valueLen: c.value.length })));

  // Hit trpc auth if present
  page.on("response", async (res) => {
    if (res.url().includes("auth.me")) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 600);
      } catch {
        body = "(unreadable)";
      }
      console.error("[PROBE] auth.me", res.status(), body);
    }
  });

  // Direct API with cookie header
  const api = await context.request.get(
    `${BASE}/api/trpc/auth.me?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: null } }))}`
  );
  console.error("[PROBE] direct auth.me", api.status(), (await api.text()).slice(0, 600));

  await page.goto(`${BASE}/admin/platform`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(2000);
  const text = (await page.locator("body").innerText()).slice(0, 500);
  console.error("[PROBE] body snippet:\n", text);
  await page.screenshot({
    path: resolve(__dirname, "_runtime-audit/probe-platform.png"),
    fullPage: true,
  });

  await browser.close();
}

async function main() {
  const token = await mint();
  await probe(token);
  process.exit(0);
}

main().catch((e) => {
  console.error("PROBE_FAIL", e);
  process.exit(1);
});
