/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — append-only Charge facts.
 * Existing Charge money fields are never edited. Corrections insert new Charges.
 */

import type { BillCharge, BillChargeCreateInput } from "./chargeContract";
import {
  ChargeCompositionError,
  computeChargeNetAmount,
  formatChargeMoney,
  parseChargeMoney,
  sumChargeNetAmounts,
} from "./chargeMoney";

export type IntendedChargeLine = Readonly<{
  originOrderItemId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
}>;

export type PlannedChargeCorrection = Readonly<{
  originOrderItemId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  lineDiscount: string;
  modifierAmount: string;
  netAmount: string;
  originReference: string;
}>;

function originKey(originOrderItemId: number | null): string {
  return originOrderItemId == null ? "order" : String(originOrderItemId);
}

/**
 * OPEN-Bill correction plan. Existing Charge money is never edited.
 * One append-only fact per origin whose net differs from the intended snapshot.
 */
export function planOpenChargeCorrections(input: {
  orderId: number;
  charges: ReadonlyArray<
    Pick<BillCharge, "netAmount" | "originOrderId" | "originOrderItemId">
  >;
  intended: readonly IntendedChargeLine[];
}): PlannedChargeCorrection[] {
  const originCharges = input.charges.filter(
    (charge) => charge.originOrderId === input.orderId
  );
  const intendedByKey = new Map<string, IntendedChargeLine>();
  for (const line of input.intended) {
    intendedByKey.set(originKey(line.originOrderItemId), line);
  }
  const keys = new Set<string>();
  for (const charge of originCharges) {
    keys.add(originKey(charge.originOrderItemId ?? null));
  }
  for (const key of intendedByKey.keys()) {
    keys.add(key);
  }

  const plans: PlannedChargeCorrection[] = [];
  for (const key of keys) {
    const originOrderItemId = key === "order" ? null : Number(key);
    const group = originCharges.filter(
      (charge) => originKey(charge.originOrderItemId ?? null) === key
    );
    const current = sumChargeNetAmounts(group);
    const line = intendedByKey.get(key);
    const intendedNet = line
      ? computeChargeNetAmount({
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineDiscount: "0.00",
          modifierAmount: "0.00",
        })
      : "0.00";
    if (parseChargeMoney(current) === parseChargeMoney(intendedNet)) {
      continue;
    }
    if (parseChargeMoney(current) === 0 && line) {
      plans.push({
        originOrderItemId: line.originOrderItemId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineDiscount: "0.00",
        modifierAmount: "0.00",
        netAmount: intendedNet,
        originReference:
          line.originOrderItemId != null
            ? `order_item:${line.originOrderItemId}`
            : `order:${input.orderId}`,
      });
      continue;
    }
    const netAmount = formatChargeMoney(
      parseChargeMoney(intendedNet) - parseChargeMoney(current)
    );
    plans.push({
      originOrderItemId,
      description: line
        ? `Correction of ${line.description}`
        : `Correction of order ${input.orderId}`,
      quantity: 1,
      unitPrice: netAmount,
      lineDiscount: "0.00",
      modifierAmount: "0.00",
      netAmount,
      originReference:
        originOrderItemId != null
          ? `correction:order_item:${originOrderItemId}`
          : `correction:order:${input.orderId}`,
    });
  }
  return plans;
}

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
