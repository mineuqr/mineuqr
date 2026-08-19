/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — frozen Charge contracts.
 *
 * A Charge is a financial line owned by Check/Bill. Not Order membership.
 * Origin fields are correlation only — they must not drive Bill calculation.
 */

export const BILL_CHARGE_COMPOSITION_PROGRAM_ID =
  "BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1" as const;

export type BillCharge = Readonly<{
  chargeId: string;
  restaurantId: number;
  checkId: number;
  sequence: number;
  description: string;
  quantity: number;
  unitPrice: string;
  lineDiscount: string;
  modifierAmount: string;
  netAmount: string;
  taxCategory: string | null;
  taxAmount: string;
  currencyCode: string;
  originOrderId: number | null;
  originOrderItemId: number | null;
  originChannel: string | null;
  originReference: string | null;
  createdAt: string;
}>;

export type BillChargeCreateInput = Readonly<{
  chargeId: string;
  restaurantId: number;
  checkId: number;
  sequence: number;
  description: string;
  quantity: number;
  unitPrice: string;
  lineDiscount: string;
  modifierAmount: string;
  netAmount: string;
  taxCategory: string | null;
  taxAmount: string;
  currencyCode: string;
  originOrderId: number | null;
  originOrderItemId: number | null;
  originChannel: string | null;
  originReference: string | null;
  createdAt: string;
}>;

export const BILL_CHARGE_MONEY_FIELDS = [
  "unitPrice",
  "quantity",
  "lineDiscount",
  "modifierAmount",
  "netAmount",
  "taxCategory",
  "taxAmount",
  "currencyCode",
] as const;

export type BillChargeMoneyField = (typeof BILL_CHARGE_MONEY_FIELDS)[number];
