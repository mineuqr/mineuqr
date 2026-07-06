import type { CategoryBackfillLineItemStore } from "./CategoryBackfillLineItemStore";
import { isUpgradedCategoryProjection } from "../persistence/categoryProjectionValidation";

export type CategoryBackfillVerificationResult = {
  ok: boolean;
  totalRows: number;
  legacyRows: number;
  invalidRows: number;
  integrityPercentage: number;
};

/**
 * ORDER-READ-BACKFILL-1 — post-backfill verification.
 */
export class OrderReadCategoryBackfillVerifier {
  constructor(private readonly store: CategoryBackfillLineItemStore) {}

  async verify(restaurantId?: number): Promise<CategoryBackfillVerificationResult> {
    const counts = await this.store.countRows(restaurantId);
    const integrityPercentage =
      counts.totalRows > 0
        ? ((counts.totalRows - counts.legacyRows) / counts.totalRows) * 100
        : 100;

    return {
      ok: counts.legacyRows === 0,
      totalRows: counts.totalRows,
      legacyRows: counts.legacyRows,
      invalidRows: counts.legacyRows,
      integrityPercentage,
    };
  }

  async verifySample(
    rows: Array<{ categoryProjection: unknown; lineItemId: number }>
  ): Promise<boolean> {
    return rows.every((row) =>
      isUpgradedCategoryProjection(row.categoryProjection, row.lineItemId)
    );
  }
}
