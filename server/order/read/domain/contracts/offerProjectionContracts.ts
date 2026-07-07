/**
 * ORDER-READ-OFFER-PROJECTION-1 — canonical offer line projection (no menu category).
 */
export const ORDER_OFFER_PROJECTION_SCHEMA_VERSION = 1 as const;

export type OrderOfferProjectionSource = "order_line_snapshot";

export type OrderOfferProjection = Readonly<{
  lineKind: "offer";
  /** Null when historical rows did not persist offer identity (menuItemId = 0 only). */
  offerId: number | null;
  titleAr: string;
  titleEn: string | null;
  source: OrderOfferProjectionSource;
  version: number;
  updatedAt: string;
}>;

export type OfferProjectionReadMeta = {
  offerProjectionVersion: number;
};

export function maxOfferProjectionVersion(
  projections: readonly Pick<OrderOfferProjection, "version">[]
): number {
  if (projections.length === 0) return 0;
  return Math.max(...projections.map((p) => p.version));
}
