import { OrderImmutableError } from "../errors/OrderDomainErrors";

export class OrderModificationPolicy {
  /** ORDER-1: lines are immutable after PlaceOrder succeeds. */
  static canModifyLines(): boolean {
    return false;
  }

  static assertCanModifyLines(): void {
    if (!OrderModificationPolicy.canModifyLines()) {
      throw new OrderImmutableError();
    }
  }
}
