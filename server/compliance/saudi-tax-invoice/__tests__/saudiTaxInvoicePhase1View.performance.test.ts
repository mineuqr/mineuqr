/**
 * SAUDI-TAX-INVOICE-PHASE-1 view service — HTML optional for Cashier polls.
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

import { findSaudiTaxInvoiceByTaxInvoiceId } from "../saudiTaxInvoiceRepository";
import { renderSaudiPhase1InvoiceHtml } from "../saudiPhase1RenderHtml";
import { getSaudiTaxInvoicePhase1View } from "../saudiTaxInvoicePhase1ViewService";

const findById = vi.mocked(findSaudiTaxInvoiceByTaxInvoiceId);
const renderHtml = vi.mocked(renderSaudiPhase1InvoiceHtml);

describe("getSaudiTaxInvoicePhase1View HTML opt-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({
      taxInvoiceId: "sti_1",
      invoiceNumber: "1",
      status: "generated",
      phase1Document: {
        taxInvoiceId: "sti_1",
        invoiceNumber: "1",
        qrRequired: true,
        qrPayloadBase64: "AQ==",
      },
    } as never);
  });

  it("skips HTML/QR PNG by default (Cashier poll path)", async () => {
    const result = await getSaudiTaxInvoicePhase1View({
      restaurantId: 1,
      taxInvoiceId: "sti_1",
    });
    expect(result?.html).toBeNull();
    expect(renderHtml).not.toHaveBeenCalled();
  });

  it("renders HTML only when includeHtml is true", async () => {
    const result = await getSaudiTaxInvoicePhase1View({
      restaurantId: 1,
      taxInvoiceId: "sti_1",
      includeHtml: true,
    });
    expect(result?.html).toBe("<html>qr</html>");
    expect(renderHtml).toHaveBeenCalledOnce();
  });
});
