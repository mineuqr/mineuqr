import { resolveOrderDisplayIdentity } from "../../business-identity/application/OrderDisplayIdentityResolver";

export type OrderIdentityRow = {
  orderNumber: string;
  businessDay: string | null;
  dailyDisplayNumber: number | null;
};

export type OrderDisplayIdentityFields = {
  businessDay: string | null;
  dailyDisplayNumber: number | null;
  displayOrderNumber: string;
  displayReference: string;
};

/** Resolves operational display identity via OrderDisplayIdentityResolver only. */
export function mapOrderDisplayIdentityFields(row: OrderIdentityRow): OrderDisplayIdentityFields {
  const identity = resolveOrderDisplayIdentity({
    orderNumber: row.orderNumber,
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
  });

  return {
    businessDay: row.businessDay,
    dailyDisplayNumber: row.dailyDisplayNumber,
    displayOrderNumber: identity.displayOrderNumber,
    displayReference: identity.displayReference,
  };
}
