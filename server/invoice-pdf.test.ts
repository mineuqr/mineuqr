import { describe, it, expect, vi } from "vitest";

// Mock PDFKit
vi.mock("pdfkit", () => {
  const EventEmitter = require("events");
  class MockPDFDocument extends EventEmitter {
    page = { width: 595.28 };
    constructor(opts?: any) {
      super();
    }
    registerFont() { return this; }
    fontSize() { return this; }
    font() { return this; }
    fillColor() { return this; }
    text() { return this; }
    image() { return this; }
    moveTo() { return this; }
    lineTo() { return this; }
    strokeColor() { return this; }
    lineWidth() { return this; }
    stroke() { return this; }
    rect() { return this; }
    fill() { return this; }
    end() {
      // Simulate PDF generation
      const chunk = Buffer.from("%PDF-1.4 mock content");
      this.emit("data", chunk);
      this.emit("end");
    }
  }
  return { default: MockPDFDocument };
});

// Mock fs
vi.mock("fs", () => ({
  default: {
    existsSync: () => true,
  },
  existsSync: () => true,
}));

describe("Invoice PDF Generation", () => {
  it("should generate a PDF buffer with valid invoice data", async () => {
    const { generateInvoicePDFBuffer } = await import("./invoice-pdf");
    
    const buffer = await generateInvoicePDFBuffer({
      invoiceNumber: "INV-1234567890-1",
      customerName: "Test Customer",
      planName: "Basic Plan",
      amount: "19.00",
      currency: "SAR",
      issuedAt: new Date().toISOString(),
      status: "paid",
      paidAt: new Date().toISOString(),
      billingCycle: "monthly",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate PDF with yearly billing cycle", async () => {
    const { generateInvoicePDFBuffer } = await import("./invoice-pdf");
    
    const buffer = await generateInvoicePDFBuffer({
      invoiceNumber: "INV-9999999999-2",
      customerName: "Annual Customer",
      planName: "Professional Plan",
      amount: "299.00",
      currency: "SAR",
      issuedAt: new Date().toISOString(),
      status: "paid",
      billingCycle: "yearly",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate PDF with pending status", async () => {
    const { generateInvoicePDFBuffer } = await import("./invoice-pdf");
    
    const buffer = await generateInvoicePDFBuffer({
      invoiceNumber: "INV-5555555555-3",
      customerName: "Pending Customer",
      planName: "Enterprise Plan",
      amount: "59.00",
      currency: "SAR",
      issuedAt: new Date().toISOString(),
      status: "pending",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should handle missing optional fields gracefully", async () => {
    const { generateInvoicePDFBuffer } = await import("./invoice-pdf");
    
    const buffer = await generateInvoicePDFBuffer({
      invoiceNumber: "INV-0000000000-4",
      customerName: "Minimal Customer",
      planName: "Basic",
      amount: "10.00",
      currency: "USD",
      issuedAt: new Date().toISOString(),
      status: "paid",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate invoice HTML", async () => {
    const { generateInvoiceHTML } = await import("./invoice-pdf");
    
    const html = generateInvoiceHTML(
      {
        id: 1,
        userId: 1,
        subscriptionId: 1,
        amount: "19.00",
        currency: "SAR",
        status: "paid",
        invoiceNumber: "INV-TEST-001",
        pdfUrl: null,
        issuedAt: new Date().toISOString(),
        dueAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "Test Company",
      "test@example.com"
    );

    expect(html).toContain("INVOICE");
    expect(html).toContain("INV-TEST-001");
    expect(html).toContain("Test Company");
    expect(html).toContain("SAR");
    expect(html).toContain("19.00");
    expect(html).toContain("mineuqr");
  });

  it("should generate legacy PDF via generateInvoicePDF", async () => {
    const { generateInvoicePDF } = await import("./invoice-pdf");
    
    const buffer = await generateInvoicePDF(
      {
        id: 1,
        userId: 1,
        subscriptionId: 1,
        amount: "35.00",
        currency: "SAR",
        status: "paid",
        invoiceNumber: "INV-LEGACY-001",
        pdfUrl: null,
        issuedAt: new Date().toISOString(),
        dueAt: new Date().toISOString(),
        paidAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "Legacy Company",
      "legacy@example.com"
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should include correct invoice number in generated HTML", async () => {
    const { generateInvoiceHTML } = await import("./invoice-pdf");
    
    const invoiceNumber = "INV-UNIQUE-12345";
    const html = generateInvoiceHTML(
      {
        id: 2,
        userId: 2,
        subscriptionId: 2,
        amount: "59.00",
        currency: "USD",
        status: "pending",
        invoiceNumber,
        pdfUrl: null,
        issuedAt: new Date().toISOString(),
        dueAt: new Date().toISOString(),
        paidAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      "Another Company",
      "another@example.com"
    );

    expect(html).toContain(invoiceNumber);
    expect(html).toContain("Another Company");
    expect(html).toContain("Pending");
  });
});
