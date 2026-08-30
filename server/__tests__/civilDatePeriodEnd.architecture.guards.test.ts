/**
 * CIVIL-DATE-PERIOD-END-INSTANT-HARDENING-1 — architecture guards.
 * Confirmed civil-date period-end producers must not use host-local Date parsing.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("civil-date period-end producers", () => {
  it("admin helpers use civilDateToPeriodEndInstant / periodEndInstantAfterCivilOffset", () => {
    const helpers = read("server/adminSubscriptionHelpers.ts");
    expect(helpers).toContain("civilDateToPeriodEndInstant");
    expect(helpers).toContain("periodEndInstantAfterCivilOffset");
    expect(helpers).toContain("resolveAdminPeriodEndInstant");
    expect(helpers).not.toMatch(/new Date\(params\.subscriptionEndDate\)/);
    expect(helpers).not.toMatch(/new Date\(input\.subscriptionEndDate\)/);
    expect(helpers).not.toContain("periodEnd.setDate");
    expect(helpers).not.toContain("periodEnd.setMonth");
  });

  it("subscription update path converts period ends via resolveAdminPeriodEndInstant", () => {
    const audit = read("server/subscriptionAudit.ts");
    expect(audit).toContain("resolveAdminPeriodEndInstant");
    expect(audit).not.toMatch(
      /currentPeriodEnd\s*=\s*new Date\(input\.subscriptionEndDate\)/
    );
  });

  it("trial and payment webhooks use civil-offset period ends", () => {
    const trial = read("server/create-trial-subscription.ts");
    expect(trial).toContain("periodEndInstantAfterCivilOffset");
    expect(trial).not.toContain("setDate(trialEndsAt.getDate()");

    const tap = read("server/tap-webhook.ts");
    expect(tap).toContain("periodEndInstantAfterCivilOffset");
    expect(tap).not.toContain("endDate.setMonth");
    expect(tap).not.toContain("endDate.setFullYear");

    const paypal = read("server/paypal-webhook.ts");
    expect(paypal).toContain("periodEndInstantAfterCivilOffset");
    expect(paypal).not.toContain("periodEnd.setMonth");
  });

  it("client suggest path uses civil calendar helpers, not host getMonth", () => {
    const dates = read("client/src/lib/subscription/dates.ts");
    expect(dates).toContain("addCivilCalendarMonths");
    expect(dates).toContain("todayYmd");
    expect(dates).not.toContain("end.setMonth");
    expect(dates).not.toContain("end.setFullYear");
  });
});
