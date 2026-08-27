import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";
import { newCashierIdempotencyKey } from "../cashierIdempotency";

describe("cashier presentation helpers", () => {
  it("keeps Cashier distinct from Register Ops in both languages", () => {
    expect(cashierUiLabel("title", "ar")).toBe("الكاشير");
    expect(cashierUiLabel("title", "en")).toBe("Cashier");
    expect(cashierUiLabel("subtitle", "en")).toContain("Register Ops");
    expect(cashierUiLabel("subtitle", "ar")).toContain("عمليات الصندوق");
    expect(cashierUiLabel("completePayment", "en")).toBe("Complete payment");
    expect(cashierUiLabel("openRegisterOps", "en")).toBe("Open Register Ops");
    expect(cashierUiLabel("returnDashboard", "ar")).toBe("العودة إلى لوحة التحكم");
    expect(cashierUiLabel("openNewTab", "ar")).toBe("فتح الكاشير في تبويب جديد");
    expect(cashierUiLabel("allCategories", "ar")).toBe("الكل");
    expect(cashierUiLabel("saleRetrySameItems", "en")).toContain("same items");
    expect(cashierUiLabel("placeSale", "ar")).toBe("الدفع");
    expect(cashierUiLabel("placeSale", "en")).toBe("Payment");
    expect(cashierUiLabel("salePlaced", "en")).toBe("Ready to pay");
    expect(cashierUiLabel("confirmPayment", "ar")).toBe("تأكيد الدفع");
    expect(cashierUiLabel("ticket", "en")).toBe("Sale / Invoice");
    expect(cashierUiLabel("saleInvoice", "en")).toBe("Sale / Invoice");
    expect(cashierUiLabel("saleInvoice", "ar")).toBe("فاتورة البيع");
    expect(cashierUiLabel("invoiceNew", "en")).toBe("New invoice");
    expect(cashierUiLabel("preparingPayment", "en")).toBe("Preparing payment…");
    expect(cashierUiLabel("paidSuccess", "ar")).toBe("تم الدفع بنجاح");
    expect(cashierUiLabel("verifyingPayment", "en")).toBe("Verifying payment…");
    expect(cashierUiLabel("recoveryUnknown", "en")).toContain("Do not retry");
    expect(cashierUiLabel("recoveryNotCommitted", "en")).toContain("may try again");
    expect(cashierUiLabel("printInvoice", "ar")).toBe("طباعة الفاتورة");
    expect(cashierUiLabel("receiptTitle", "ar")).toBe("فاتورة مدفوعة");
    expect(cashierUiLabel("receiptTitle", "en")).toBe("Paid receipt");
    expect(cashierUiLabel("receiptItems", "ar")).toBe("الأصناف");
    expect(cashierUiLabel("receiptItems", "en")).toBe("Items");
    expect(cashierUiLabel("receiptClose", "ar")).toBe("إغلاق");
    expect(cashierUiLabel("receiptClose", "en")).toBe("Close");
    expect(cashierUiLabel("receiptInvoiceNumber", "ar")).toBe("فاتورة رقم");
    expect(cashierUiLabel("receiptVat", "ar")).toBe("الضريبة VAT");
    expect(cashierUiLabel("receiptPaidStamp", "en")).toBe("Paid");
    expect(cashierUiLabel("shiftBeforePay", "ar")).toBe(
      "يجب فتح وردية الصندوق قبل إتمام الدفع"
    );
    expect(cashierUiLabel("cancelPayment", "ar")).toBe("إلغاء");
    expect(cashierUiLabel("totalTendered", "ar")).toBe("إجمالي المدفوع");
    expect(cashierUiLabel("tenderCash", "ar")).toBe("نقدًا");
    expect(cashierUiLabel("tenderNetwork", "ar")).toBe("شبكة");
    expect(cashierUiLabel("tenderMixed", "ar")).toBe("تسوية");
    expect(cashierUiLabel("tenderComplimentary", "en")).toBe("Complimentary");
    expect(cashierUiLabel("applyDiscount", "ar")).toBe("خصم");
    expect(cashierUiLabel("incomingOrders", "en")).toBe("Incoming orders");
    expect(cashierUiLabel("noIncomingOrders", "en")).toContain("awaiting payment");
    expect(cashierUiLabel("changeDue", "ar")).toBe("الباقي للعميل");
  });

  it("issues command idempotency keys in the existing POS length window", () => {
    const key = newCashierIdempotencyKey("sale");
    expect(key.startsWith("cashier-sale-")).toBe(true);
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(128);
    expect(newCashierIdempotencyKey("sale")).not.toBe(key);
  });
});
