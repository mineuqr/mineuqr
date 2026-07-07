import type { OrderOfferProjection } from "../../domain/contracts/offerProjectionContracts";
import { ORDER_OFFER_PROJECTION_SCHEMA_VERSION } from "../../domain/contracts/offerProjectionContracts";

export function parseStoredOfferProjection(
  value: unknown,
  lineItemId: number
): OrderOfferProjection {
  if (value == null || typeof value !== "object") {
    throw new Error(`Offer projection missing for line item ${lineItemId}`);
  }
  const row = value as Record<string, unknown>;
  if (row.lineKind !== "offer") {
    throw new Error(`Invalid offer projection kind for line item ${lineItemId}`);
  }
  const titleAr = String(row.titleAr ?? "");
  if (!titleAr.trim()) {
    throw new Error(`Offer projection missing titleAr for line item ${lineItemId}`);
  }
  const version = Number(row.version);
  const updatedAt = String(row.updatedAt ?? "");
  if (!Number.isInteger(version) || version <= 0 || !updatedAt.trim()) {
    throw new Error(`Invalid offer projection version for line item ${lineItemId}`);
  }

  return Object.freeze({
    lineKind: "offer",
    offerId: row.offerId == null ? null : Number(row.offerId),
    titleAr,
    titleEn: row.titleEn == null ? null : String(row.titleEn),
    source: "order_line_snapshot",
    version,
    updatedAt,
  });
}

export function isCanonicalOfferProjection(value: unknown, lineItemId: number): boolean {
  try {
    parseStoredOfferProjection(value, lineItemId);
    return true;
  } catch {
    return false;
  }
}

export function expectedOfferProjectionSchemaVersion(): number {
  return ORDER_OFFER_PROJECTION_SCHEMA_VERSION;
}
