import {
  resolveOrderDisplayIdentity,
  type OrderIdentitySource,
} from "../../../../server/order/business-identity/application/OrderDisplayIdentityResolver";

export type OperationalOrderIdentitySource = OrderIdentitySource & {
  /** Pre-resolved by read APIs via OrderDisplayIdentityResolver. */
  displayReference?: string;
  displayOrderNumber?: string;
};

/**
 * Operational label for staff-facing surfaces.
 * Prefers server-resolved displayReference; falls back to OrderDisplayIdentityResolver.
 */
export function operationalDisplayReference(source: OperationalOrderIdentitySource): string {
  if (source.displayReference) {
    return source.displayReference;
  }
  return resolveOrderDisplayIdentity({
    orderNumber: source.orderNumber,
    businessDay: source.businessDay ?? null,
    dailyDisplayNumber: source.dailyDisplayNumber ?? null,
  }).displayReference;
}

/** Staff-facing heading, e.g. "#006". */
export function formatOperationalOrderHeading(
  source: OperationalOrderIdentitySource,
  options?: { prefix?: string }
): string {
  const prefix = options?.prefix ?? "#";
  return `${prefix}${operationalDisplayReference(source)}`;
}
