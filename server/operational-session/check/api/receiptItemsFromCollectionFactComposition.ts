/**
 * RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1
 * Map frozen Collection Fact composition onto Receipt item snapshot.
 *
 * CF composition is the existing historical line source
 * ("frozen line composition for reporting without live Order/Check").
 * This is not a second invoice line store.
 */

import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import type { SettlementRecordItemSnapshotLineDto } from "./settlementRecordApiDtos";

export function receiptItemsFromCollectionFactComposition(
  fact: CollectionFact
): readonly SettlementRecordItemSnapshotLineDto[] {
  return [...fact.composition]
    .sort((a, b) => a.sequence - b.sequence)
    .map((line) => ({
      orderId: line.originOrderId ?? fact.orderId,
      name: line.description.trim() || "Item",
      // Composition is already a committed line; qty is not stored on CF.
      quantity: 1,
      unitPrice: line.netAmount,
      lineTotal: line.netAmount,
    }));
}
