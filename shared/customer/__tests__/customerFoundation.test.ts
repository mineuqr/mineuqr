/**
 * CUSTOMER-FOUNDATION-1 — behavioral acceptance (shared validation + display).
 */
import { describe, expect, it } from "vitest";
import {
  CASHIER_ANONYMOUS_CUSTOMER_LABEL,
  cashierCustomerDisplayLabel,
  validateCustomerCreate,
} from "@shared/customer";

describe("CUSTOMER-FOUNDATION-1 validation", () => {
  it("CASE 01: Individual with name only is valid", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "خالد",
        customerType: "individual",
      })
    ).toEqual([]);
  });

  it("CASE 02/03: Saudi Individual without tax number is valid at Customer layer", () => {
    // Country does not enter Customer validation — no tax number required.
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "خالد",
        customerType: "individual",
        taxNumber: null,
      })
    ).toEqual([]);
  });

  it("CASE 04: Business without tax number is valid at Customer Foundation", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "شركة خالد",
        customerType: "business",
        taxNumber: null,
      })
    ).toEqual([]);
  });

  it("CASE 05: Business with optional tax number is valid", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "شركة خالد",
        customerType: "business",
        taxNumber: "310175397400001",
      })
    ).toEqual([]);
  });

  it("CASE 06: Non-Saudi Individual with name only is valid", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 2,
        displayName: "Ahmed",
        customerType: "individual",
      })
    ).toEqual([]);
  });

  it("CASE 07: null customer displays نقدًا — not a Customer entity", () => {
    expect(cashierCustomerDisplayLabel(null, "ar")).toBe(
      CASHIER_ANONYMOUS_CUSTOMER_LABEL.ar
    );
    expect(cashierCustomerDisplayLabel(undefined, "en")).toBe(
      CASHIER_ANONYMOUS_CUSTOMER_LABEL.en
    );
    expect(CASHIER_ANONYMOUS_CUSTOMER_LABEL.ar).toContain("نقدًا");
  });

  it("CASE 08: same display names are allowed by validation", () => {
    const a = validateCustomerCreate({
      restaurantId: 1,
      displayName: "خالد",
      customerType: "individual",
    });
    const b = validateCustomerCreate({
      restaurantId: 1,
      displayName: "خالد",
      customerType: "individual",
    });
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  });

  it("rejects empty display name", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "   ",
        customerType: "individual",
      }).some((i) => i.field === "displayName")
    ).toBe(true);
  });

  it("Cashier create: Individual without tax number is valid", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "سارة",
        customerType: "individual",
        phone: "0500000000",
        taxNumber: null,
      })
    ).toEqual([]);
  });

  it("Cashier create: Business without tax number is valid by global contract", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "مؤسسة النور",
        customerType: "business",
        taxNumber: null,
      })
    ).toEqual([]);
  });

  it("Cashier create: optional tax number is accepted when provided", () => {
    expect(
      validateCustomerCreate({
        restaurantId: 1,
        displayName: "مؤسسة النور",
        customerType: "business",
        taxNumber: "300000000000003",
      })
    ).toEqual([]);
  });

  it("cleared customer falls back to نقدًا display label", () => {
    expect(cashierCustomerDisplayLabel(null, "ar")).toBe("العميل: نقدًا");
    expect(
      cashierCustomerDisplayLabel({ id: 9, displayName: "سارة" }, "ar")
    ).toContain("سارة");
  });
});
