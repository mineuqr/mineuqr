/**
 * ST-TENDER-PROJECTION-CLEANUP-1
 *
 * Captured payment-method analytics: Collection Fact tenders win for a sale.
 * Historical ST lines contribute only when no production CF occupies that Check.
 * Does not write CF, ST, Check, or refunds.
 */

export const ST_TENDER_PROJECTION_CLEANUP_PROGRAM_ID =
  "ST-TENDER-PROJECTION-CLEANUP-1" as const;

export type PaymentMethodAnalyticsTenderLine = Readonly<{
  paymentMethod: string;
  amount: string;
  status: string;
  checkId: number;
  /** Distinct sale identity for checkCount. CF uses collectionFactId. */
  saleKey?: string;
}>;

export function mergeCapturedTenderLinesPreferringCollectionFact(input: {
  collectionFactLines: readonly PaymentMethodAnalyticsTenderLine[];
  historicalStLines: readonly PaymentMethodAnalyticsTenderLine[];
  overlappingCheckIds: ReadonlySet<number>;
}): PaymentMethodAnalyticsTenderLine[] {
  const captured: PaymentMethodAnalyticsTenderLine[] = [
    ...input.collectionFactLines,
  ];
  for (const line of input.historicalStLines) {
    if (line.checkId > 0 && input.overlappingCheckIds.has(line.checkId)) {
      continue;
    }
    captured.push(line);
  }
  return captured;
}
