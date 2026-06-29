import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TARGET_FILES = [
  "server/admin-audit-fix2.test.ts",
  "server/admin-auth-1b.test.ts",
  "server/admin-auth-1d.test.ts",
  "server/admin-auth-1e.test.ts",
  "server/admin-invoice-billing.test.ts",
  "server/admin-subscription.test.ts",
  "server/passwordResetAudit.test.ts",
  "server/payment-flow.test.ts",
  "server/restaurant-profile-verification.test.ts",
  "server/roleChangeAudit.test.ts",
  "server/routers.test.ts",
  "server/session-owner-workspace.test.ts",
  "server/session-public-recovery.test.ts",
  "server/subscription-invoice-verification.test.ts",
  "server/subscription.test.ts",
  "server/commercial/adminAuth1c.test.ts",
  "server/commercial/authorityCleanup1.test.ts",
  "server/commercial/exec3DashboardApi.test.ts",
  "server/commercial/exec7c2CommercialOverview.test.ts",
  "server/commercial/reporting/analyticsAlignment.test.ts",
  "server/commercial/reporting/CommercialReportService.test.ts",
];

const INSERT_LINE =
  "  generateOrderNumber: vi.fn(async () => \"ORD-MOCK-001\"),\n";

const STATIC_DB_MOCK_RE =
  /vi\.mock\((['"])([^'"]*db)\1,\s*\(\)\s*=>\s*\(\{\n/;

for (const rel of TARGET_FILES) {
  const filePath = path.join(ROOT, rel);
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes("generateOrderNumber")) {
    console.log(`SKIP ${rel}`);
    continue;
  }
  const match = content.match(STATIC_DB_MOCK_RE);
  if (!match || match.index == null) {
    console.log(`NO_MATCH ${rel}`);
    continue;
  }
  const insertAt = match.index + match[0].length;
  content = content.slice(0, insertAt) + INSERT_LINE + content.slice(insertAt);
  fs.writeFileSync(filePath, content);
  console.log(`UPDATED ${rel}`);
}
