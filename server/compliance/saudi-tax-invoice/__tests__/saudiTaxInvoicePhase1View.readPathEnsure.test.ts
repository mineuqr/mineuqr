/**
 * CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1 — read-path ensure.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../saudiTaxInvoiceRepository", () => ({
  findSaudiTaxInvoiceByTaxInvoiceId: vi.fn(),
  findSaudiTaxInvoiceByOrderId: vi.fn(),
}));

vi.mock("../saudiPhase1GenerationService", () => ({
  applySaudiPhase1Generation: vi.fn(async (row: unknown) => row),
}));

vi.mock("../saudiPhase1RenderHtml", () => ({
  renderSaudiPhase1InvoiceHtml: vi.fn(async () => "<html>qr</html>"),
}));

vi.mock("../saudiTaxInvoiceService", () => ({
  ensureSaudiTaxInvoiceForCollectionFact: vi.fn(),
}));

vi.mock("../../restaurantCountryContext", () => ({
  resolveAuthoritativeRestaurantCountryCode: vi.fn(async () => "SA"),
}));

vi.mock(
  "../../../operational-session/payment/collection-fact/collectionFactRepository",
  () => ({
    findProductionCollectionFactByOrderId: vi.fn(),
  })
);

import { findSaudiTaxInvoiceByOrderId } from "../saudiTaxInvoiceRepository";
import { ensureSaudiTaxInvoiceForCollectionFact } from "../saudiTaxInvoiceService";
import { findProductionCollectionFactByOrderId } from "../../../operational-session/payment/collection-fact/collectionFactRepository";
import { getSaudiTaxInvoicePhase1ViewByOrder } from "../saudiTaxInvoicePhase1ViewService";

const findByOrder = vi.mocked(findSaudiTaxInvoiceByOrderId);
const ensure = vi.mocked(ensureSaudiTaxInvoiceForCollectionFact);
const findFact = vi.mocked(findProductionCollectionFactByOrderId);

describe("getPhase1ByOrder read-path ensure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures from production Collection Fact when Tax Invoice row is missing", async () => {
    findByOrder.mockResolvedValueOnce(null);
    findFact.mockResolvedValue({
      collectionFactId: "pcf_1",
      committedAt: "2026-09-06 11:00:00",
    } as never);
    ensure.mockResolvedValue({
      outcome: "created",
      taxInvoice: {
        taxInvoiceId: "sti_1",
        invoiceNumber: "TI-1",
        status: "generated",
        phase1Document: {
          taxInvoiceId: "sti_1",
          invoiceNumber: "TI-1",
          qrRequired: true,
          qrPayloadBase64: "AQ==",
        },
      },
    } as never);

    const result = await getSaudiTaxInvoicePhase1ViewByOrder({
      restaurantId: 1,
      orderId: 99,
      includeHtml: false,
    });

    expect(ensure).toHaveBeenCalledWith(
      expect.objectContaining({
        collectionFactId: "pcf_1",
        restaurantId: 1,
        orderId: 99,
        countryCode: "SA",
      })
    );
    expect(result?.document?.invoiceNumber).toBe("TI-1");
    expect(result?.html).toBeNull();
  });

  it("does not ensure when a Tax Invoice row already exists", async () => {
    findByOrder.mockResolvedValue({
      taxInvoiceId: "sti_1",
      invoiceNumber: "TI-1",
      status: "generated",
      phase1Document: {
        taxInvoiceId: "sti_1",
        invoiceNumber: "TI-1",
        qrRequired: true,
        qrPayloadBase64: "AQ==",
      },
    } as never);

    await getSaudiTaxInvoicePhase1ViewByOrder({
      restaurantId: 1,
      orderId: 99,
    });

    expect(ensure).not.toHaveBeenCalled();
    expect(findFact).not.toHaveBeenCalled();
  });
});
