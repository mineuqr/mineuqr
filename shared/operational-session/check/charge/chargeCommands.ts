/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — append-only Charge facts.
 * Existing Charge money fields are never edited. Corrections insert new Charges.
 */

import type { BillCharge, BillChargeCreateInput } from "./chargeContract";
import {
  ChargeCompositionError,
  formatChargeMoney,
  parseChargeMoney,
} from "./chargeMoney";

export function assertChargeCreateInput(input: BillChargeCreateInput): void {
  if (!input.chargeId.trim()) {
    throw new ChargeCompositionError("chargeId required");
  }
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new ChargeCompositionError("restaurantId required");
  }
  if (!Number.isInteger(input.checkId) || input.checkId <= 0) {
    throw new ChargeCompositionError("checkId required");
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 1) {
    throw new ChargeCompositionError("sequence must be >= 1");
  }
  if (!input.currencyCode.trim()) {
    throw new ChargeCompositionError("currencyCode required");
  }
  parseChargeMoney(input.unitPrice);
  parseChargeMoney(input.lineDiscount);
  parseChargeMoney(input.modifierAmount);
  parseChargeMoney(input.netAmount);
  parseChargeMoney(input.taxAmount);
}

/** Build a compensating Charge that zeros `source.netAmount` without mutating it. */
export function buildReversalCharge(input: {
  source: BillCharge;
  chargeId: string;
  sequence: number;
  createdAt: string;
}): BillChargeCreateInput {
  const reversed = formatChargeMoney(-parseChargeMoney(input.source.netAmount));
  if (reversed === "0.00") {
    throw new ChargeCompositionError("Cannot reverse a zero-net Charge");
  }
  return {
    chargeId: input.chargeId,
    restaurantId: input.source.restaurantId,
    checkId: input.source.checkId,
    sequence: input.sequence,
    description: `Reversal of ${input.source.chargeId}`,
    quantity: input.source.quantity,
    unitPrice: input.source.unitPrice,
    lineDiscount: input.source.lineDiscount,
    modifierAmount: input.source.modifierAmount,
    netAmount: reversed,
    taxCategory: input.source.taxCategory,
    taxAmount: formatChargeMoney(-parseChargeMoney(input.source.taxAmount)),
    currencyCode: input.source.currencyCode,
    originOrderId: input.source.originOrderId,
    originOrderItemId: input.source.originOrderItemId,
    originChannel: input.source.originChannel,
    originReference: `reversal_of:${input.source.chargeId}`,
    createdAt: input.createdAt,
  };
}
