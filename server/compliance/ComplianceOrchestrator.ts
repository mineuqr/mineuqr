/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Routes authoritative compliance events to country modules.
 * Does not create tax artifacts or mutate financial truth.
 */

import {
  resolveComplianceModule,
  type ProductionCollectionFactCommittedEvent,
} from "@shared/compliance";
import { resolveAuthoritativeRestaurantCountryCode } from "./restaurantCountryContext";
import "./saudi-tax-invoice/registerSaudiTaxInvoiceDomain";

export type ProductionCollectionFactComplianceInput = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  orderId: number;
  committedAt: string;
  commitOutcome: "created" | "replayed";
  cashierInvoiceNumber?: string | null;
}>;

export async function orchestrateProductionCollectionFactCommitted(
  input: ProductionCollectionFactComplianceInput
): Promise<void> {
  const countryCode =
    (await resolveAuthoritativeRestaurantCountryCode(input.restaurantId)) ?? "";
  const module = resolveComplianceModule(countryCode);
  const event: ProductionCollectionFactCommittedEvent = {
    collectionFactId: input.collectionFactId,
    restaurantId: input.restaurantId,
    countryCode,
    orderId: input.orderId,
    committedAt: input.committedAt,
    commitOutcome: input.commitOutcome,
    cashierInvoiceNumber: input.cashierInvoiceNumber ?? null,
  };
  await module.onProductionCollectionFactCommitted(event);
}
