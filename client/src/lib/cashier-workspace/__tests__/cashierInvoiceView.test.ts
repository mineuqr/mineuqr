import { describe, expect, it } from "vitest";
import {
  buildDraftCashierInvoiceView,
  buildPreparedCashierInvoiceView,
  cashierCatalogTicketMatchesInvoiceLines,
  cashierTicketMatchesSaleAttempt,
  catalogTicketFromInvoiceLines,
  mapDraftTicketToPreparedInvoiceLines,
  mapSaleCreateLinesToInvoiceLines,
  projectPreparedCashierInvoiceMoney,
  unitPriceFromLineTotal,
} from "../cashierInvoiceView";

describe("CashierInvoiceView", () => {
  it("builds a draft invoice from catalog lines without Order identity", () => {
    const view = buildDraftCashierInvoiceView({
      ticket: [
        {
          menuItemId: 3,
          nameAr: "عصير",
          nameEn: "Juice",
          price: "10.00",
          quantity: 2,
        },
      ],
      previewMoney: {
        subtotal: "20.00",
        discountAmount: "0.00",
        taxAmount: "3.00",
        grandTotal: "23.00",
      },
      cashierDisplayName: "خالد",
      terminalId: "term-1",
    });
    expect(view.stage).toBe("draft");
    expect(view.editable).toBe(true);
    expect(view.displayReference).toBeNull();
    expect(view.lines[0]?.lineTotal).toBe("20.00");
    expect(view.money?.grandTotal).toBe("23.00");
  });

  it("maps sale.create lines and money as the prepared invoice", () => {
    const lines = mapSaleCreateLinesToInvoiceLines(
      [
        {
          description: "عصير",
          quantity: 2,
          netAmount: "24.00",
          originOrderItemId: 91,
        },
      ],
      [
        {
          menuItemId: 3,
          nameAr: "عصير برتقال",
          nameEn: "Orange juice",
          price: "12.00",
          quantity: 2,
        },
      ]
    );
    expect(unitPriceFromLineTotal("24.00", 2)).toBe("12.00");
    const view = buildPreparedCashierInvoiceView({
      orderId: 44,
      orderNumber: "ORD-0007",
      displayReference: "P #015",
      createdAt: "2026-08-26T12:30:00.000Z",
      money: {
        subtotal: "24.00",
        taxAmount: "3.60",
        grandTotal: "27.60",
        billDiscountAmount: "0.00",
      },
      lines,
      cashierDisplayName: "خالد",
      terminalId: "term-1",
    });
    expect(view.stage).toBe("prepared");
    expect(view.editable).toBe(false);
    expect(view.displayReference).toBeNull();
    expect(view.createdAt).toBeNull();
    expect(view.orderId).toBe(44);
    expect(view.orderNumber).toBe("ORD-0007");
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]?.nameEn).toBe("Orange juice");
    expect(view.lines[0]?.unitPrice).toBe("12.00");
    expect(view.lines[0]?.lineTotal).toBe("24.00");
    expect(view.money?.grandTotal).toBe("27.60");
    expect(view.money?.taxAmount).toBe("3.60");
    expect(view.money?.subtotal).toBe("24.00");
  });

  it("maps draft catalog lines into a prepared invoice without Order identity", () => {
    const lines = mapDraftTicketToPreparedInvoiceLines([
      {
        menuItemId: 3,
        nameAr: "عصير",
        nameEn: "Juice",
        price: "10.00",
        quantity: 2,
      },
    ]);
    expect(lines[0]?.menuItemId).toBe(3);
    expect(lines[0]?.lineTotal).toBe("20.00");
    expect(lines[0]?.unitPrice).toBe("10.00");
  });

  it("round-trips prepared lines to an editable catalog ticket", () => {
    const lines = mapSaleCreateLinesToInvoiceLines(
      [
        {
          description: "عصير",
          quantity: 2,
          netAmount: "24.00",
          originOrderItemId: 91,
        },
      ],
      [
        {
          menuItemId: 3,
          nameAr: "عصير برتقال",
          nameEn: "Orange juice",
          price: "12.00",
          quantity: 2,
        },
      ]
    );
    const ticket = catalogTicketFromInvoiceLines(lines);
    expect(ticket).toEqual([
      {
        menuItemId: 3,
        nameAr: "عصير برتقال",
        nameEn: "Orange juice",
        price: "12.00",
        quantity: 2,
      },
    ]);
    expect(cashierCatalogTicketMatchesInvoiceLines(ticket, lines)).toBe(true);
    expect(
      cashierCatalogTicketMatchesInvoiceLines(
        [{ ...ticket[0], quantity: 3 }],
        lines
      )
    ).toBe(false);
    expect(
      cashierCatalogTicketMatchesInvoiceLines(
        [{ ...ticket[0], price: "11.00" }],
        lines
      )
    ).toBe(false);
  });

  it("matches a pending sale.create attempt by menu item and quantity", () => {
    expect(
      cashierTicketMatchesSaleAttempt(
        [{ menuItemId: 3, quantity: 2, nameAr: "x", nameEn: "x", price: "1.00" }],
        [{ menuItemId: 3, quantity: 2 }]
      )
    ).toBe(true);
    expect(
      cashierTicketMatchesSaleAttempt(
        [{ menuItemId: 3, quantity: 3, nameAr: "x", nameEn: "x", price: "1.00" }],
        [{ menuItemId: 3, quantity: 2 }]
      )
    ).toBe(false);
  });

  it("projects prepared payable money with discount before VAT using the shared engine", () => {
    const lines = mapSaleCreateLinesToInvoiceLines(
      [
        {
          description: "item",
          quantity: 1,
          netAmount: "100.00",
          originOrderItemId: 1,
        },
      ],
      [
        {
          menuItemId: 3,
          nameAr: "x",
          nameEn: "x",
          price: "100.00",
          quantity: 1,
        },
      ]
    );
    const money = projectPreparedCashierInvoiceMoney({
      lines,
      billDiscountAmount: "20.00",
      taxPolicySnapshot: {
        version: 1,
        enabled: true,
        mode: "exclusive",
        components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
      },
    });
    expect(money).toEqual({
      subtotal: "80.00",
      discountAmount: "20.00",
      taxAmount: "12.00",
      grandTotal: "92.00",
    });
  });
});
