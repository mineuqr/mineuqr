/**
 * Starts non-financial downstream work after a payment fact has committed.
 * Does not influence the paid result returned to Cashier.
 * Retry/recovery of undelivered Check work is owned by
 * recoverCashierPosDownstreamSettlements, not this helper.
 */
export function dispatchBestEffortDownstreamDelivery(input: {
  delivery: () => Promise<void>;
  onFailure: (error: unknown) => void;
}): void {
  void input.delivery().catch(input.onFailure);
}
