import {
  formatDisplayOrderNumber,
  formatDisplayReference,
} from "./DisplayReferenceFormatter";
import {
  resolveBusinessIdentityScope,
  type BusinessIdentityScope,
} from "./resolveBusinessIdentityScope";
import type { DisplayReferenceFormat, OrderDisplayIdentity } from "../types";

export type OrderIdentitySource = {
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  identityScope?: string | null;
  fulfilmentAnchorType?: string | null;
  serviceMode?: string | null;
};

/**
 * Resolves staff-facing display identity from persisted read fields.
 * Falls back to legacy orderNumber when business identity is not yet assigned.
 */
export function resolveOrderDisplayIdentity(
  source: OrderIdentitySource,
  format: DisplayReferenceFormat = "sequence"
): OrderDisplayIdentity {
  const identityScope: BusinessIdentityScope = resolveBusinessIdentityScope(source);

  if (source.businessDay && source.dailyDisplayNumber != null) {
    const displayOrderNumber = formatDisplayOrderNumber(source.dailyDisplayNumber);
    return {
      businessDay: source.businessDay,
      dailyDisplayNumber: source.dailyDisplayNumber,
      identityScope,
      displayOrderNumber,
      displayReference: formatDisplayReference(
        source.businessDay,
        source.dailyDisplayNumber,
        format,
        identityScope
      ),
    };
  }

  return {
    businessDay: source.businessDay ?? "",
    dailyDisplayNumber: source.dailyDisplayNumber ?? 0,
    identityScope,
    displayOrderNumber: source.orderNumber,
    displayReference: source.orderNumber,
  };
}
