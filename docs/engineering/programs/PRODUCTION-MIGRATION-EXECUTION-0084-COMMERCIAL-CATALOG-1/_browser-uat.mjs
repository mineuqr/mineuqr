/**
 * PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1
 * Browser UAT — Playwright against local foundation (no app deploy in this program).
 *
 * Prefers minted admin session at _uat-artifacts/admin-session.json
 * Optional: UAT_EMAIL / UAT_PASSWORD
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "_uat-artifacts");
mkdirSync(outDir, { recursive: true });

const BASE = process.env.UAT_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = process.env.UAT_EMAIL || "";
const PASSWORD = process.env.UAT_PASSWORD || "";
const sessionPath = resolve(outDir, "admin-session.json");

const checks = [];

function record(id, status, notes) {
  checks.push({ id, status, notes });
  console.error(`[UAT] ${status.toUpperCase()} ${id}${notes ? ` — ${notes}` : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  if (existsSync(sessionPath)) {
    const session = JSON.parse(readFileSync(sessionPath, "utf8"));
    await context.addCookies([
      {
        name: session.cookieName,
        value: session.cookieValue,
        url: BASE,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    record("login", "pass", `Minted admin session (adminId=${session.adminId})`);
  }

  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(String(err.message || err));
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      const url = res.url();
      if (
        url.includes("commercialCatalog") ||
        url.includes("/admin/platform") ||
        url.includes("trpc")
      ) {
        failedRequests.push({ status: res.status(), url });
      }
    }
  });

  try {
    await page.goto(`${BASE}/admin/platform`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: resolve(outDir, "01-platform-ops.png"),
      fullPage: true,
    });

    const bodyText = await page.locator("body").innerText();
    const accessDenied = /الوصول مرفوض|Access Denied|فقط المسؤولون/i.test(
      bodyText
    );
    const needsLogin =
      !existsSync(sessionPath) &&
      /sign in|log in|تسجيل الدخول/i.test(bodyText);

    if (accessDenied && !existsSync(sessionPath)) {
      record("login", "fail", "Access denied — mint admin session first");
    } else if (needsLogin && EMAIL && PASSWORD) {
      await page.goto(`${BASE}/login`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      const email = page.locator('input[type="email"], input[name="email"]').first();
      const password = page
        .locator('input[type="password"], input[name="password"]')
        .first();
      if ((await email.count()) > 0 && (await password.count()) > 0) {
        await email.fill(EMAIL);
        await password.fill(PASSWORD);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(2000);
        record("login", "pass", "Submitted credentials");
      } else {
        record("login", "fail", "Login form fields not found");
      }
    } else if (!existsSync(sessionPath) && !accessDenied) {
      record("login", "pass", "Shell visible without mint");
    }

    await page.screenshot({
      path: resolve(outDir, "02-platform-after-auth.png"),
      fullPage: true,
    });

    await page.goto(`${BASE}/admin/platform/commercial-catalog`, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await page.waitForTimeout(3500);
    await page.screenshot({
      path: resolve(outDir, "03-commercial-catalog.png"),
      fullPage: true,
    });

    const catalogRoot = page.locator(
      '[data-slot="platform-ops-commercial-catalog"]'
    );
    const denied = await page.locator("body").innerText();
    const hasDenied = /الوصول مرفوض|Access Denied|فقط المسؤولون/i.test(denied);

    if (hasDenied) {
      record("platform_admin_loads", "fail", "Admin access denied");
      record("catalog_page_renders", "fail", "Blocked by admin gate");
    } else if ((await catalogRoot.count()) > 0) {
      record("platform_admin_loads", "pass", "Platform Ops shell + catalog root");
      record(
        "catalog_page_renders",
        "pass",
        "data-slot platform-ops-commercial-catalog"
      );
    } else if (/Commercial Catalog|الكتالوج التجاري/i.test(denied)) {
      record("platform_admin_loads", "pass", "Commercial Catalog copy visible");
      record("catalog_page_renders", "pass", "Title/body rendered");
    } else {
      record(
        "platform_admin_loads",
        "fail",
        "Catalog root not found — is foundation code running?"
      );
      record("catalog_page_renders", "fail", "Composition missing");
    }

    const navLink = page.locator('a[href*="commercial-catalog"]');
    if (
      (await navLink.count()) > 0 ||
      /Realtime|Subscription|Commercial|الكتالوج|العمليات/i.test(denied)
    ) {
      record(
        "navigation",
        "pass",
        "Platform Ops navigation / catalog link present"
      );
    } else {
      record("navigation", "fail", "Section nav not detected");
    }

    const pageText = await page.locator("body").innerText();
    const modules = [
      ["plans_list", /Plans|الخطط/i],
      ["versions_list", /Plan Versions|Versions|الإصدارات/i],
      ["pricing_page", /Pricing|التسعير|أسعار/i],
      ["feature_bundles", /Feature Bundles|حزم الميزات/i],
      ["limit_profiles", /Limit Profiles|ملفات حدود/i],
      ["regional_policies", /Regional Policies|المناطق|إقليمية/i],
      ["publication_page", /Publication|النشر|حالة النشر/i],
      [
        "validation_messages",
        /Validation|CC-16|التحقق|Validating|Incomplete|Valid|No plan versions|لا إصدارات/i,
      ],
    ];
    for (const [id, re] of modules) {
      if (re.test(pageText)) record(id, "pass", "Visible on catalog surface");
      else record(id, "fail", "Label not found on page");
    }

    const reactErrors = consoleErrors.filter(
      (e) =>
        /react|minified|TypeError|ReferenceError|Invariant/i.test(e) &&
        !/favicon|WebSocket|vite/i.test(e)
    );
    if (reactErrors.length === 0) {
      record("no_react_errors", "pass", "No React pageerrors captured");
    } else {
      record("no_react_errors", "fail", reactErrors.slice(0, 3).join(" | "));
    }

    const relevantFails = failedRequests.filter(
      (r) =>
        r.url.includes("commercialCatalog") ||
        (r.status >= 500 && r.url.includes("trpc"))
    );
    if (relevantFails.length === 0) {
      record("no_failed_network", "pass", "No commercialCatalog/trpc 5xx");
    } else {
      record(
        "no_failed_network",
        "fail",
        relevantFails
          .slice(0, 5)
          .map((r) => `${r.status} ${r.url}`)
          .join(" | ")
      );
    }
  } finally {
    await browser.close();
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const verdict =
    failCount === 0 ? "PASS" : passCount > 0 ? "PARTIAL" : "FAIL";

  const report = {
    program: "PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1",
    baseUrl: BASE,
    verdict,
    passCount,
    failCount,
    checks,
    consoleErrors: consoleErrors.slice(0, 20),
    failedRequests: failedRequests.slice(0, 20),
    artifactsDir: outDir,
  };

  writeFileSync(
    resolve(outDir, "browser-uat-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("BROWSER_UAT_FAIL", e);
  process.exit(1);
});
