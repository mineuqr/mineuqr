/**
 * ORDERS-READ-MODEL-1 Phase 3A — write model vs projection integrity checks.
 * Pure functions used by staging validation scripts and unit tests.
 */

export type OrderWriteRow = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  tableNumber: number;
  trackingToken: string | null;
};

export type OrderProjectionRow = {
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  status: string;
  totalAmount: string;
  tableNumber: number;
  trackingToken: string | null;
};

export type IntegrityMismatch =
  | {
      type: "count_mismatch";
      restaurantId: number;
      writeCount: number;
      projectionCount: number;
    }
  | {
      type: "missing_projection";
      restaurantId: number;
      orderId: number;
    }
  | {
      type: "field_mismatch";
      restaurantId: number;
      orderId: number;
      field: keyof OrderWriteRow;
      writeValue: string;
      projectionValue: string;
    }
  | {
      type: "tenant_leak";
      restaurantId: number;
      orderId: number;
      expectedRestaurantId: number;
    };

const COMPARED_FIELDS: (keyof OrderWriteRow)[] = [
  "orderNumber",
  "status",
  "totalAmount",
  "tableNumber",
  "trackingToken",
];

function normalizeDecimal(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}

export function compareOrderCounts(
  restaurantId: number,
  writeCount: number,
  projectionCount: number
): IntegrityMismatch | null {
  if (writeCount === projectionCount) return null;
  return { type: "count_mismatch", restaurantId, writeCount, projectionCount };
}

export function compareOrderRow(
  write: OrderWriteRow,
  projection: OrderProjectionRow | null
): IntegrityMismatch[] {
  const mismatches: IntegrityMismatch[] = [];

  if (!projection) {
    mismatches.push({
      type: "missing_projection",
      restaurantId: write.restaurantId,
      orderId: write.orderId,
    });
    return mismatches;
  }

  if (projection.restaurantId !== write.restaurantId) {
    mismatches.push({
      type: "tenant_leak",
      restaurantId: projection.restaurantId,
      orderId: projection.orderId,
      expectedRestaurantId: write.restaurantId,
    });
  }

  for (const field of COMPARED_FIELDS) {
    const writeValue =
      field === "totalAmount"
        ? normalizeDecimal(String(write[field] ?? ""))
        : String(write[field] ?? "");
    const projectionValue =
      field === "totalAmount"
        ? normalizeDecimal(String(projection[field] ?? ""))
        : String(projection[field] ?? "");

    if (writeValue !== projectionValue) {
      mismatches.push({
        type: "field_mismatch",
        restaurantId: write.restaurantId,
        orderId: write.orderId,
        field,
        writeValue,
        projectionValue,
      });
    }
  }

  return mismatches;
}

export function summarizeIntegrity(mismatches: IntegrityMismatch[]): {
  ok: boolean;
  countMismatch: number;
  missingProjection: number;
  fieldMismatch: number;
  tenantLeak: number;
} {
  return {
    ok: mismatches.length === 0,
    countMismatch: mismatches.filter((m) => m.type === "count_mismatch").length,
    missingProjection: mismatches.filter((m) => m.type === "missing_projection").length,
    fieldMismatch: mismatches.filter((m) => m.type === "field_mismatch").length,
    tenantLeak: mismatches.filter((m) => m.type === "tenant_leak").length,
  };
}
