/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 — orchestrator tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  noOpComplianceModule,
  saudiZatcaComplianceModule,
  type ProductionCollectionFactCommittedEvent,
} from "@shared/compliance";

vi.mock("../restaurantCountryContext", () => ({
  resolveAuthoritativeRestaurantCountryCode: vi.fn(),
}));

import { resolveAuthoritativeRestaurantCountryCode } from "../restaurantCountryContext";
import { orchestrateProductionCollectionFactCommitted } from "../ComplianceOrchestrator";

describe("ComplianceOrchestrator", () => {
  beforeEach(() => {
    vi.mocked(resolveAuthoritativeRestaurantCountryCode).mockReset();
  });

  it("invokes Saudi module with authoritative restaurant context for SA", async () => {
    vi.mocked(resolveAuthoritativeRestaurantCountryCode).mockResolvedValue("SA");
    const spy = vi
      .spyOn(saudiZatcaComplianceModule, "onProductionCollectionFactCommitted")
      .mockResolvedValue(undefined);
    await orchestrateProductionCollectionFactCommitted({
      collectionFactId: "pcf_test_1",
      restaurantId: 42,
      orderId: 9001,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "created",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0] as ProductionCollectionFactCommittedEvent;
    expect(event.restaurantId).toBe(42);
    expect(event.countryCode).toBe("SA");
    expect(event.collectionFactId).toBe("pcf_test_1");
    spy.mockRestore();
  });

  it("invokes NoOp module for unsupported countries", async () => {
    vi.mocked(resolveAuthoritativeRestaurantCountryCode).mockResolvedValue("US");
    const spy = vi
      .spyOn(noOpComplianceModule, "onProductionCollectionFactCommitted")
      .mockResolvedValue(undefined);
    await orchestrateProductionCollectionFactCommitted({
      collectionFactId: "pcf_test_2",
      restaurantId: 7,
      orderId: 100,
      committedAt: "2026-08-31T12:00:00.000Z",
      commitOutcome: "replayed",
    });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("orchestrator routes via modules and does not own Tax Invoice persistence", async () => {
    const orchestrator = await import("../ComplianceOrchestrator");
    expect(String(orchestrator.orchestrateProductionCollectionFactCommitted)).not.toContain(
      "insertSaudiTaxInvoiceRow"
    );
    const registry = await import("@shared/compliance/resolveComplianceModule");
    expect(String(registry.resolveComplianceModule)).not.toContain("insertSaudiTaxInvoiceRow");
  });
});
