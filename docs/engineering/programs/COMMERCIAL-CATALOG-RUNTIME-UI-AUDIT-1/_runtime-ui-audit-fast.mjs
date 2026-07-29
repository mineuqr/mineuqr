/**
 * Fast runtime UI audit — Commercial Catalog
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "_runtime-audit");
mkdirSync(outDir, { recursive: true });

const BASE = process.env.UAT_BASE_URL || "http://127.0.0.1:3000";
const sessionPath = resolve(
  process.cwd(),
  "docs/engineering/programs/PRODUCTION-MIGRATION-EXECUTION-0084-COMMERCIAL-CATALOG-1/_uat-artifacts/admin-session.json"
);

const findings = {
  base: BASE,
  route: "/admin/platform/commercial-catalog",
  steps: [],
  capabilities: {},
  buttonsFound: [],
  screenshots: [],
  verdictNotes: [],
};

function log(msg) {
  console.error(`[AUDIT] ${msg}`);
}

function step(id, ok, notes) {
  findings.steps.push({ id, ok, notes });
  log(`${ok ? "PASS" : "FAIL"} ${id} — ${notes}`);
}

async function shot(page, name) {
  const path = resolve(outDir, name);
  await page.screenshot({ path, fullPage: true });
  findings.screenshots.push(name);
  log(`shot ${name}`);
  return path;
}

async function visibleButtons(page) {
  return page.locator("button").evaluateAll((nodes) =>
    nodes
      .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
  );
}

async function main() {
  log(`start BASE=${BASE}`);
  const session = JSON.parse(readFileSync(sessionPath, "utf8"));
  log(`session cookie=${session.cookieName} len=${session.cookieValue?.length}`);

  log("launching chromium...");
  const browser = await chromium.launch({ headless: true });
  log("browser launched");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([
    {
      name: session.cookieName,
      value: session.cookieValue,
      url: BASE,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  page.setDefaultTimeout(45_000);

  log("goto /admin/platform");
  await page.goto(`${BASE}/admin/platform`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2000);
  await shot(page, "01-platform-ops.png");
  const hubText = await page.locator("body").innerText();
  const denied = /Access Denied|الوصول مرفوض|فقط المسؤولون/i.test(hubText);
  step("hub_access", !denied, denied ? "Access denied" : "Admin hub reachable");

  const catLink = page.locator('a[href="/admin/platform/commercial-catalog"]').first();
  const hasNavLink = (await catLink.count()) > 0;
  step("nav_link", hasNavLink, hasNavLink ? "Nav link present" : "No nav link — direct goto");
  if (hasNavLink) {
    await catLink.click();
  } else {
    await page.goto(`${BASE}/admin/platform/commercial-catalog`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
  }
  await page.waitForTimeout(2500);
  await shot(page, "02-catalog-default.png");

  const url = page.url();
  step("catalog_url", url.includes("/admin/platform/commercial-catalog"), `URL=${url}`);

  const body = await page.locator("body").innerText();
  const hasExperience = /Experience live|Plan Wizard|Manage|Dashboard|Commercial Catalog/i.test(body);
  step("catalog_shell", hasExperience, hasExperience ? "Experience shell rendered" : "Shell missing");

  let buttons = await visibleButtons(page);
  findings.buttonsFound.push({ context: "default_load", buttons: [...new Set(buttons)] });
  const createPlanOnDefault = buttons.some((b) => /^Create Plan$/i.test(b));
  step(
    "create_plan_on_default",
    true,
    createPlanOnDefault
      ? "Create Plan visible on default load"
      : "Create Plan NOT on default (Dashboard) — behind Manage"
  );

  const plansMetricClickable = await page
    .locator('[data-slot="platform-ops-commercial-catalog"] a')
    .filter({ hasText: /^Plans$/i })
    .count();
  step(
    "plans_metric_clickable",
    plansMetricClickable === 0,
    plansMetricClickable === 0
      ? "Hero Plans metric is NOT a nav link"
      : "Unexpected Plans link in hero"
  );

  const manageBtn = page.getByRole("button", { name: /^Manage$/i });
  const manageVisible = (await manageBtn.count()) > 0;
  step("manage_tab", manageVisible, manageVisible ? "Manage tab present" : "Manage tab missing");
  if (manageVisible) {
    await manageBtn.click();
    await page.waitForTimeout(1500);
    await shot(page, "03-manage-plans.png");
  }

  buttons = await visibleButtons(page);
  findings.buttonsFound.push({ context: "manage_default", buttons: [...new Set(buttons)] });

  const createPlanBtn = page.getByRole("button", { name: /^Create Plan$/i });
  const hasCreatePlan = (await createPlanBtn.count()) > 0;
  findings.capabilities.createPlan = hasCreatePlan
    ? {
        yes: true,
        route: "/admin/platform/commercial-catalog",
        button: "Create Plan",
        path: "Platform Ops → Commercial Catalog → Manage → Plans",
      }
    : { yes: false, why: "Create Plan not found after Manage" };
  step("create_plan_button", hasCreatePlan, hasCreatePlan ? "Create Plan under Manage/Plans" : "Missing");

  if (hasCreatePlan) {
    await createPlanBtn.click();
    await page.waitForTimeout(800);
    await shot(page, "04-create-plan-dialog.png");
    const dialogTitle = await page.getByRole("heading", { name: /Create Plan/i }).count();
    step("create_plan_dialog", dialogTitle > 0, "Create Plan dialog opened");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }

  const editBtn = page.getByRole("button", { name: /^Edit$/i });
  const archiveBtn = page.getByRole("button", { name: /^Archive$/i });
  findings.capabilities.editPlan = {
    yes: (await editBtn.count()) > 0,
    route: "/admin/platform/commercial-catalog",
    button: "Edit",
    note: "Row action under Manage → Plans",
  };
  findings.capabilities.archivePlan = {
    yes: (await archiveBtn.count()) > 0,
    route: "/admin/platform/commercial-catalog",
    button: "Archive",
    renderedNow: (await archiveBtn.count()) > 0,
  };

  const versionsTab = page.getByRole("button", { name: /^Plan Versions$/i });
  if ((await versionsTab.count()) > 0) {
    await versionsTab.click();
    await page.waitForTimeout(1000);
    await shot(page, "05-manage-versions.png");
  }
  buttons = await visibleButtons(page);
  findings.buttonsFound.push({ context: "manage_versions", buttons: [...new Set(buttons)] });
  findings.capabilities.createVersion = {
    yes: buttons.some((b) => /Create Version/i.test(b)),
    route: "/admin/platform/commercial-catalog",
    button: "Create Version",
  };
  findings.capabilities.cloneVersion = {
    yes: buttons.some((b) => /^Clone$/i.test(b)),
    route: "/admin/platform/commercial-catalog",
    button: "Clone",
    renderedNow: buttons.some((b) => /^Clone$/i.test(b)),
  };
  findings.capabilities.publishVersion = {
    yes: buttons.some((b) => /^Publish$/i.test(b)),
    route: "/admin/platform/commercial-catalog",
    button: "Publish",
    renderedNow: buttons.some((b) => /^Publish$/i.test(b)),
  };

  async function openExp(name) {
    const btn = page.getByRole("button", { name: new RegExp(`^${name}$`, "i") });
    if ((await btn.count()) === 0) {
      log(`tab missing: ${name}`);
      return false;
    }
    await btn.click();
    await page.waitForTimeout(1000);
    return true;
  }

  if (await openExp("Compare")) {
    await shot(page, "06-compare.png");
    findings.capabilities.compareVersions = {
      yes: /Version Comparison|Left version|Right version/i.test(await page.locator("body").innerText()),
      route: "/admin/platform/commercial-catalog",
      button: "Compare",
    };
  }

  if (await openExp("Manage")) {
    const pricing = page.getByRole("button", { name: /^Pricing$/i });
    if ((await pricing.count()) > 0) {
      await pricing.click();
      await page.waitForTimeout(700);
      buttons = await visibleButtons(page);
      findings.capabilities.createPricing = {
        yes: buttons.some((b) => /Create Price/i.test(b)),
        route: "/admin/platform/commercial-catalog",
        button: "Create Price",
      };
    }
    for (const [label, key, btnLabel] of [
      ["Feature Bundles", "createBundle", "Create Bundle"],
      ["Limit Profiles", "createLimitProfile", "Create Profile"],
      ["Trial Policies", "createTrialPolicy", "Create"],
      ["Regional Policies", "createRegionalPolicy", "Create Region"],
      ["Promotions", "createPromotion", "Create"],
    ]) {
      const tab = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
      if ((await tab.count()) > 0) {
        await tab.click();
        await page.waitForTimeout(600);
        buttons = await visibleButtons(page);
        const match = buttons.find((b) => new RegExp(btnLabel, "i").test(b));
        findings.capabilities[key] = {
          yes: Boolean(match),
          route: "/admin/platform/commercial-catalog",
          button: match || btnLabel,
        };
      } else {
        findings.capabilities[key] = { yes: false, why: `Subsection ${label} not found` };
      }
    }
  }

  if (await openExp("Plan Wizard")) {
    await shot(page, "07-wizard.png");
    const text = await page.locator("body").innerText();
    findings.capabilities.publicationWizard = {
      yes: /Plan Creation Wizard|Validate & Publish|Save Draft Graph/i.test(text),
      route: "/admin/platform/commercial-catalog",
      button: "Plan Wizard",
    };
  }

  if (await openExp("Customer Preview")) {
    await shot(page, "08-customer-preview.png");
    findings.capabilities.customerPreview = {
      yes: /Customer Preview|Preview as customer/i.test(await page.locator("body").innerText()),
      route: "/admin/platform/commercial-catalog",
      button: "Customer Preview",
    };
  }

  if (await openExp("Pricing Preview")) {
    await shot(page, "09-pricing-preview.png");
    findings.capabilities.pricingPreview = {
      yes: /Public Pricing Preview|Pricing Preview/i.test(await page.locator("body").innerText()),
      route: "/admin/platform/commercial-catalog",
      button: "Pricing Preview",
    };
  }

  if (await openExp("Bulk Ops")) {
    await shot(page, "10-bulk.png");
    buttons = await visibleButtons(page);
    findings.capabilities.bulkOperations = {
      yes: buttons.some((b) => /Bulk Publish/i.test(b)),
      route: "/admin/platform/commercial-catalog",
      button: buttons.find((b) => /Bulk/i.test(b)) || "Bulk Publish",
    };
  }

  await page.goto(`${BASE}/admin/platform/commercial-catalog/plans`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(1200);
  const nestedUrl = page.url();
  findings.verdictNotes.push(
    nestedUrl.includes("/plans")
      ? `Nested /plans URL stayed: ${nestedUrl} (SPA may not 404)`
      : `Redirected away from nested /plans → ${nestedUrl}`
  );
  await shot(page, "11-nested-plans-attempt.png");

  writeFileSync(resolve(outDir, "runtime-audit.json"), JSON.stringify(findings, null, 2));
  log("done writing runtime-audit.json");
  console.log(JSON.stringify({ ok: true, outDir, capabilityKeys: Object.keys(findings.capabilities) }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error("AUDIT_FAIL", e);
  writeFileSync(
    resolve(outDir, "runtime-audit.json"),
    JSON.stringify({ ok: false, error: String(e.message || e), stack: e.stack }, null, 2)
  );
  process.exit(1);
});
