import {
  resolveOrderDisplayIdentity,
  type OrderIdentitySource,
} from "../../../../server/order/business-identity/application/OrderDisplayIdentityResolver";

export type OperationalOrderIdentitySource = OrderIdentitySource & {
  /** Pre-resolved by read APIs via OrderDisplayIdentityResolver. */
  displayReference?: string;
  displayOrderNumber?: string;
  identityScope?: string | null;
  fulfilmentAnchorType?: string | null;
  serviceMode?: string | null;
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
    identityScope: source.identityScope ?? null,
    fulfilmentAnchorType: source.fulfilmentAnchorType ?? null,
    serviceMode: source.serviceMode ?? null,
  }).displayReference;
}

/**
 * Staff-facing heading — Business Identity owns the full string (e.g. "T #001").
 * Do not assemble T/K/# locally in presentation.
 */
export function formatOperationalOrderHeading(
  source: OperationalOrderIdentitySource,
  _options?: { prefix?: string }
): string {
  return operationalDisplayReference(source);
}
