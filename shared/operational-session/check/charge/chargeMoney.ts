/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — Charge money helpers.
 * netAmount is the composition input. Bill tax remains Bill-level on the sum.
 */

export class ChargeCompositionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChargeCompositionError";
  }
}

export function parseChargeMoney(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) {
    throw new ChargeCompositionError(`Invalid charge money: ${value}`);
  }
  return n;
}

export function formatChargeMoney(value: number): string {
  if (!Number.isFinite(value)) {
    throw new ChargeCompositionError("Invalid charge money number");
  }
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

export function computeChargeNetAmount(input: {
  unitPrice: string;
  quantity: number;
  lineDiscount: string;
  modifierAmount: string;
}): string {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new ChargeCompositionError("Charge quantity must be a positive integer");
  }
  const gross =
    parseChargeMoney(input.unitPrice) * input.quantity +
    parseChargeMoney(input.modifierAmount) -
    parseChargeMoney(input.lineDiscount);
  return formatChargeMoney(gross);
}

export function sumChargeNetAmounts(
  charges: ReadonlyArray<{ netAmount: string }>
): string {
  let sum = 0;
  for (const charge of charges) {
    sum += parseChargeMoney(charge.netAmount);
  }
  return formatChargeMoney(sum);
}

export function originNetAmount(
  charges: ReadonlyArray<{
    netAmount: string;
    originOrderId: number | null;
    originOrderItemId?: number | null;
  }>,
  origin: { orderId: number; orderItemId?: number }
): string {
  let sum = 0;
  for (const charge of charges) {
    if (charge.originOrderId !== origin.orderId) continue;
    if (
      origin.orderItemId != null &&
      charge.originOrderItemId !== origin.orderItemId
    ) {
      continue;
    }
    sum += parseChargeMoney(charge.netAmount);
  }
  return formatChargeMoney(sum);
}
