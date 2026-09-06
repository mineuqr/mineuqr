/**
 * CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1
 * Compliance must complete before operational settlement starts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orchestrate: vi.fn(async () => undefined),
  waitUntil: vi.fn(),
  opsLog: vi.fn(),
}));

vi.mock("../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../ComplianceOrchestrator", () => ({
  orchestrateProductionCollectionFactCommitted: (...a: unknown[]) =>
    mocks.orchestrate(...a),
}));

vi.mock("@vercel/functions", () => ({
  waitUntil: (p: Promise<unknown>) => mocks.waitUntil(p),
}));

import { dispatchComplianceAfterProductionCollectionFact } from "../dispatchComplianceAfterProductionCollectionFact";

describe("CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1 — compliance sequencing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs afterCompliance only after Compliance orchestration finishes", async () => {
    const order: string[] = [];
    mocks.orchestrate.mockImplementation(async () => {
      order.push("compliance");
      await new Promise((r) => setTimeout(r, 40));
      order.push("compliance-done");
    });

    dispatchComplianceAfterProductionCollectionFact(
      {
        restaurantId: 1,
        orderId: 2,
        collectionFactId: "pcf_1",
        committedAt: "2026-09-06T11:00:00.000Z",
        commitOutcome: "created",
      },
      {
        afterCompliance: async () => {
          order.push("settlement");
        },
      }
    );

    await vi.waitFor(() => {
      expect(order).toEqual(["compliance", "compliance-done", "settlement"]);
    });
    expect(mocks.waitUntil).toHaveBeenCalled();
    expect(mocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "complianceAfterCollectionFact",
        metadata: expect.objectContaining({
          collectionFactId: "pcf_1",
          durationMs: expect.any(Number),
        }),
      })
    );
  });

  it("still runs afterCompliance when Compliance fails (PAID unchanged path)", async () => {
    const order: string[] = [];
    mocks.orchestrate.mockRejectedValue(new Error("compliance down"));

    dispatchComplianceAfterProductionCollectionFact(
      {
        restaurantId: 1,
        orderId: 2,
        collectionFactId: "pcf_1",
        committedAt: "2026-09-06T11:00:00.000Z",
        commitOutcome: "created",
      },
      {
        afterCompliance: async () => {
          order.push("settlement");
        },
      }
    );

    await vi.waitFor(() => {
      expect(order).toEqual(["settlement"]);
    });
  });
});
