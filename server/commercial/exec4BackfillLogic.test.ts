/**
 * EXEC-4 — backfill planning logic tests (imports scripts/lib).
 */
import { describe, expect, it } from "vitest";

// @ts-expect-error — .mjs module without types
import { buildBackfillPlan, pickBackfillWinner, planLabel } from "../../scripts/lib/exec4-backfill-logic.mjs";

const NOW = new Date("2026-06-08T12:00:00.000Z");

function sub(overrides: Record<string, unknown>) {
  return {
    id: 1,
    userId: 1,
    restaurantId: 720007,
    planId: 30001,
    status: "active" as const,
    billingCycle: "monthly" as const,
    currentPeriodStart: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    trialEndsAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("EXEC-4 backfill logic", () => {
  it("picks PROFESSIONAL tier over BASIC for user 14760004", () => {
    const scoped = [
      sub({ id: 630001, userId: 14760004, restaurantId: 720003, planId: 30001 }),
      sub({ id: 630002, userId: 14760004, restaurantId: 720005, planId: 30001 }),
      sub({ id: 600002, userId: 14760004, restaurantId: 720006, planId: 30002 }),
    ];
    const winner = pickBackfillWinner(scoped, NOW);
    expect(winner.id).toBe(600002);
    expect(planLabel(winner.planId)).toBe("PROFESSIONAL");
  });

  it("builds H-A plan for single scoped admin row", () => {
    const plan = buildBackfillPlan({
      subscriptions: [sub({ id: 600001, userId: 1, restaurantId: 720007 })],
      users: [{ id: 1, role: "admin" }],
      now: NOW,
    });
    expect(plan.plans).toHaveLength(1);
    expect(plan.plans[0].cohort).toBe("H-A");
    expect(plan.plans[0].action).toBe("UPDATE_IN_PLACE");
    expect(plan.plans[0].mechanism).toBe("R3-A");
    expect(plan.plans[0].after.canonicalAccountId).toBe(600001);
  });

  it("builds H-C plan with expire ids for multi-scoped user", () => {
    const plan = buildBackfillPlan({
      subscriptions: [
        sub({ id: 600002, userId: 14760004, restaurantId: 720006, planId: 30002 }),
        sub({ id: 630001, userId: 14760004, restaurantId: 720003, planId: 30001 }),
        sub({ id: 630002, userId: 14760004, restaurantId: 720005, planId: 30001 }),
      ],
      users: [{ id: 14760004, role: "user" }],
      now: NOW,
    });
    const p = plan.plans[0];
    expect(p.cohort).toBe("H-C");
    expect(p.action).toBe("INSERT_ACCOUNT_EXPIRE_SCOPED");
    expect(p.winner.id).toBe(600002);
    expect(p.after.expectedPlan).toBe("PROFESSIONAL");
    expect(p.after.expireIds).toEqual([600002, 630001, 630002]);
  });

  it("skips when entitled account row already exists", () => {
    const plan = buildBackfillPlan({
      subscriptions: [
        sub({ id: 99, userId: 14760004, restaurantId: 0, planId: 30002 }),
        sub({ id: 600002, userId: 14760004, restaurantId: 720006, planId: 30002 }),
      ],
      users: [{ id: 14760004, role: "user" }],
      now: NOW,
    });
    expect(plan.plans[0].action).toBe("SKIP");
    expect(plan.plans[0].mechanism).toBe("ALREADY_CANONICAL");
  });
});
