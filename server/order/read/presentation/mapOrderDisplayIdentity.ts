import { resolveOrderDisplayIdentity } from "../../business-identity/application/OrderDisplayIdentityResolver";

export type OrderIdentityRow = {
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  identityScope?: string | null;
  fulfilmentAnchorType?: string | null;
  serviceMode?: string | null;
};

export type OrderDisplayIdentityFields = {
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  identityScope: string;
  displayOrderNumber: string;
  displayReference: string;
};

/** Resolves operational display identity via OrderDisplayIdentityResolver only. */
export function mapOrderDisplayIdentityFields(row: OrderIdentityRow): OrderDisplayIdentityFields {
  const identity = resolveOrderDisplayIdentity({
    orderNumber: row.orderNumber,
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
    identityScope: row.identityScope,
    fulfilmentAnchorType: row.fulfilmentAnchorType,
    serviceMode: row.serviceMode,
  });

  return {
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
    identityScope: identity.identityScope,
    displayOrderNumber: identity.displayOrderNumber,
    displayReference: identity.displayReference,
  };
}
