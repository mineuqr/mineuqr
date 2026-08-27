/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 * Non-financial handoff errors. Not Collection Fact / PAID failures.
 */
export class CashierHandoffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CashierHandoffError";
  }
}
