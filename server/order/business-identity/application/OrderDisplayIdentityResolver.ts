import {
  formatDisplayOrderNumber,
  formatDisplayReference,
} from "./DisplayReferenceFormatter";
import type { DisplayReferenceFormat, OrderDisplayIdentity } from "../types";

export type OrderIdentitySource = {
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
};

/**
 * Resolves staff-facing display identity from persisted read fields.
 * Falls back to legacy orderNumber when business identity is not yet assigned.
 */
export function resolveOrderDisplayIdentity(
  source: OrderIdentitySource,
  format: DisplayReferenceFormat = "sequence"
): OrderDisplayIdentity {
  if (source.businessDay && source.dailyDisplayNumber != null) {
    const displayOrderNumber = formatDisplayOrderNumber(source.dailyDisplayNumber);
    return {
      businessDay: source.businessDay,
      dailyDisplayNumber: source.dailyDisplayNumber,
      displayOrderNumber,
      displayReference: formatDisplayReference(
        source.businessDay,
        source.dailyDisplayNumber,
        format
      ),
    };
  }

  return {
    businessDay: source.businessDay ?? "",
    dailyDisplayNumber: source.dailyDisplayNumber ?? 0,
    displayOrderNumber: source.orderNumber,
    displayReference: source.orderNumber,
  };
}
