/**
 * Starts non-financial downstream work after a payment fact has committed.
 * This is deliberately best-effort: it does not retry, poll, schedule work,
 * or influence the paid result returned to Cashier.
 */
export function dispatchBestEffortDownstreamDelivery(input: {
  delivery: () => Promise<void>;
  onFailure: (error: unknown) => void;
}): void {
  void input.delivery().catch(input.onFailure);
}
