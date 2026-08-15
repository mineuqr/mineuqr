/**
 * COMMERCIAL-ADMIN-SUBSCRIPTION-CHARGED-TERMS-INTEGRITY-1
 * Architecture guards. Does not implement Admin Charged Terms completion.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("GUARD-ADMIN-CT Admin subscription financial integrity", () => {
  it("GUARD-ADMIN-CT-01 Admin create/update input has no amount or price field", () => {
    const routers = read("server/routers.ts");
    const createBlock = routers.slice(
      routers.indexOf("createUserSubscriptionByAdmin: protectedProcedure"),
      routers.indexOf("updateUserSubscriptionByAdmin: protectedProcedure")
    );
    expect(createBlock).toContain("planId: livePlanUuidInput");
    expect(createBlock).toContain('billingCycle: z.enum(["monthly", "yearly"])');
    expect(createBlock).not.toContain("chargedAmount");
    expect(createBlock).not.toContain("priceMonthly");
    expect(createBlock).not.toMatch(/amount:\s*z\./);

    const updateBlock = routers.slice(
      routers.indexOf("updateUserSubscriptionByAdmin: protectedProcedure"),
      routers.indexOf("generateInvoicePDF: protectedProcedure") > 0
        ? Math.min(
            routers.indexOf("deleteUserSubscriptionByAdmin:"),
            routers.indexOf("generateInvoicePDF: protectedProcedure") || Number.MAX_SAFE_INTEGER
          )
        : routers.indexOf("deleteUserSubscriptionByAdmin:")
    );
    expect(updateBlock).not.toContain("chargedAmount");
    expect(updateBlock).not.toMatch(/amount:\s*z\./);
  });

  it("GUARD-ADMIN-CT-02 user_subscriptions has no charged-terms columns", () => {
    const schema = read("drizzle/schema.ts");
    const table = schema.slice(
      schema.indexOf('export const userSubscriptions = mysqlTable("user_subscriptions"'),
      schema.indexOf("export type InsertUserSubscription")
    );
    expect(table).toContain("planId: varchar({ length: 36 }).notNull()");
    expect(table).toContain("billingCycle:");
    expect(table).not.toContain("chargedAmount");
    expect(table).not.toContain("chargedCurrency");
  });

  it("GUARD-ADMIN-CT-03 Admin create persist passes billingCycleCode and fail-closes", () => {
    const audit = read("server/subscriptionAudit.ts");
    const createFn = audit.slice(
      audit.indexOf("export async function applyAdminUserSubscriptionCreate"),
      audit.indexOf("function buildAdminSubscriptionUpdateData")
    );
    expect(createFn).toContain("resolveChargedTermsForAdminCreate");
    expect(createFn).toContain("persistAdminCreateChargedTerms");
    expect(createFn).toContain("billingCycleCode: billingCycle");
    expect(createFn).toContain("deleteUserSubscriptionById(result.id)");
    expect(createFn).not.toContain("ensureLivePlanBoundForSubscription");
  });

  it("GUARD-ADMIN-CT-04 Admin UI mutate payload has no price/amount", () => {
    const ui = read(
      "client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx"
    );
    const submit = ui.slice(ui.indexOf("const handleSubSubmit"));
    expect(submit).toContain("createSubMutation.mutate");
    expect(submit).toContain("planId: subPlanId");
    expect(submit).toContain("billingCycle: subBillingCycle");
    expect(submit).not.toContain("chargedAmount");
    expect(submit).not.toContain("priceMonthly");
  });

  it("GUARD-ADMIN-CT-05 missing Charged Terms fail-closed in MRR", () => {
    const mrr = read("server/commercial/metrics/chargedTermsMrr.ts");
    expect(mrr).toContain('classification: "INCOMPLETE_CHARGED_TERMS"');
    expect(mrr).toContain("if (!terms) continue");
    expect(mrr).not.toContain("currentPriceForPlan");
    expect(mrr).not.toContain("priceMonthly");
  });

  it("GUARD-ADMIN-CT-06 Admin plan/cycle update appends snapshot, does not overwrite", () => {
    const audit = read("server/subscriptionAudit.ts");
    const updateFn = audit.slice(
      audit.indexOf("export async function applyAdminUserSubscriptionUpdate")
    );
    expect(updateFn).toContain("applyAdminCommercialIdentityChange");
    expect(updateFn).not.toContain("ensureLivePlanBoundForSubscription");
    expect(updateFn).not.toContain("persistAdminCreateChargedTerms");
    expect(updateFn).not.toContain("deleteUserSubscriptionById");
    expect(updateFn).not.toContain("onDuplicateKeyUpdate");
  });
});
