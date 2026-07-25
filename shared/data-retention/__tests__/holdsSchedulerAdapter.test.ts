/**
 * DATA-RETENTION-PLATFORM-1 — holds, scheduler, adapter isolation.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  assertAdapterTenantIsolation,
  buildPlatformFallbackPolicy,
  createDataRetentionPlatform,
  createRetentionAdapterRegistry,
  createRetentionScheduler,
  enqueueDryRunArchive,
  enqueueSimulation,
  evaluateRetentionEligibility,
  mergeRetentionFeatureFlags,
} from "@shared/data-retention";

describe("holds", () => {
  it("blocks purge under legal / financial / manual hold", () => {
    const platform = createDataRetentionPlatform({
      flags: { dryRunDefault: false, purgeJobsEnabled: false },
    });
    const subject = {
      restaurantId: 1,
      entityType: "financial_shift" as const,
      entityId: "fsh_1",
    };
    platform.placeHold({
      holdId: "h1",
      kind: "legal_hold",
      restaurantId: 1,
      entityType: "financial_shift",
      entityId: "fsh_1",
      active: true,
      placedAt: "2026-07-25T00:00:00.000Z",
    });

    const policy = {
      ...buildPlatformFallbackPolicy(
        "financial_shift",
        "2026-01-01T00:00:00.000Z"
      ),
      purgeEnabled: true,
      archiveEnabled: true,
    };
    const eligibility = evaluateRetentionEligibility({
      policy,
      timestamps: {
        referenceAt: "2020-01-01T00:00:00.000Z",
        archivedAt: "2020-06-01T00:00:00.000Z",
      },
      currentState: "RESTORABLE",
      nowIso: "2026-07-25T00:00:00.000Z",
      holdKinds: platform.holds.activeKinds(subject),
    });
    expect(eligibility.holdActive).toBe(true);
    expect(eligibility.purgeEligible).toBe(false);
    expect(eligibility.reasons).toContain("purge_blocked_by_hold");
  });
});

describe("scheduler", () => {
  it("supports dry run and simulation without executing domain work", async () => {
    const flags = mergeRetentionFeatureFlags({
      dryRunDefault: true,
      archiveJobsEnabled: false,
    });
    const scheduler = createRetentionScheduler({ flags });
    const seen: string[] = [];
    scheduler.on("dry_run", (job) => {
      seen.push(job.kind);
    });
    scheduler.on("simulation", (job) => {
      seen.push(job.kind);
    });
    enqueueDryRunArchive(scheduler, 42);
    enqueueSimulation(scheduler, 42);
    await scheduler.runNext();
    await scheduler.runNext();
    expect(seen).toEqual(["dry_run", "simulation"]);
  });

  it("rejects live purge when flag disabled", () => {
    const scheduler = createRetentionScheduler({
      flags: mergeRetentionFeatureFlags({
        dryRunDefault: false,
        purgeJobsEnabled: false,
      }),
    });
    expect(() =>
      scheduler.enqueue({
        jobId: "p1",
        kind: "purge",
        dryRun: false,
        simulation: false,
      })
    ).toThrow(/Purge jobs disabled/);
  });
});

describe("adapter tenant isolation", () => {
  it("denies cross-tenant owner mismatch", async () => {
    const adapters = createRetentionAdapterRegistry();
    adapters.register({
      entityType: "order",
      resolveEntity: () => true,
      resolveTimestamps: () => ({ referenceAt: "2026-01-01T00:00:00.000Z" }),
      resolveOwner: () => 99,
      resolveEligibility: () => ({ eligibleForRetentionEvaluation: true }),
    });
    const adapter = adapters.get("order")!;
    await expect(
      assertAdapterTenantIsolation(adapter, {
        restaurantId: 1,
        entityType: "order",
        entityId: "o1",
      })
    ).rejects.toThrow(/Cross-tenant/);
  });
});
