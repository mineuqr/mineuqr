/**
 * ORDERS-SERVE-ACTION-UX-AND-STATE-FIX-1
 * Cashier POS operational complete uses the same settlement visibility
 * contract as listActive: paid/complimentary Check OR production Collection Fact.
 * Does not write Collection Facts or Checks.
 */
import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { isFinanciallyCompleteCheckOutcome } from "@shared/operational-session/check/lifecycleSettlementGuards";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { findFinanciallyCompleteMembershipForOrder } from "../../operational-session/check/checkOrderMembershipRepository";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import { isCashierPosOperationallyListed } from "../read/cashierPosOperationalVisibility";

export async function assertCashierPosOrderCompletable(input: {
  restaurantId: number;
  orderId: number;
}): Promise<void> {
  const completeMembership = await findFinanciallyCompleteMembershipForOrder(
    input.restaurantId,
    input.orderId
  );
  const paidCheck = isFinanciallyCompleteCheckOutcome(
    completeMembership?.checkOutcome
  );
  let productionCollectionFact = false;
  if (!paidCheck) {
    const fact = await findProductionCollectionFactByOrderId({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    });
    productionCollectionFact = fact != null;
  }

  if (
    !isCashierPosOperationallyListed({
      orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
      paidCheck,
      productionCollectionFact,
    })
  ) {
    throw new LifecycleSettlementGuardError(
      "ORDER_REQUIRES_SETTLEMENT",
      "Cannot complete order before settlement."
    );
  }
}
