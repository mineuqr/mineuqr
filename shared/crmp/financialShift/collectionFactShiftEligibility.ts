/**
 * CASH-DRAWER-SHIFT-ATTRIBUTION-CONSISTENCY-FIX-1
 * Temporal eligibility: a Collection Fact may belong only to a Shift whose
 * lifetime covers CF.committedAt. Never picks latest / current / oldest.
 */

export type ShiftCommitCoverage<T> =
  | { readonly kind: "none" }
  | { readonly kind: "unique"; readonly shift: T }
  | { readonly kind: "ambiguous"; readonly shifts: readonly T[] };

/**
 * Compare repository/DB instants. Prefer epoch when both parse.
 * Fixture timestamps such as `t2`/`t3` stay lexical so existing tests remain valid.
 * Mixed parseable/unparseable pairs are incomparable (not a valid window).
 */
export function compareAttributionInstants(
  left: string,
  right: string
): number | null {
  const a = Date.parse(left);
  const b = Date.parse(right);
  const aOk = !Number.isNaN(a);
  const bOk = !Number.isNaN(b);
  if (aOk && bOk) return a - b;
  if (!aOk && !bOk) {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }
  return null;
}

/**
 * Inclusive open, exclusive close:
 *   openedAt <= committedAt < closedAt
 * Open shifts (closedAt null) accept any committedAt >= openedAt.
 */
export function collectionFactCommitFallsInShiftWindow(input: {
  committedAt: string;
  openedAt: string;
  closedAt: string | null;
}): boolean {
  const committedAt = input.committedAt.trim();
  const openedAt = input.openedAt.trim();
  if (!committedAt || !openedAt) return false;
  const openedCmp = compareAttributionInstants(openedAt, committedAt);
  if (openedCmp == null || openedCmp > 0) return false;
  const closedAt = input.closedAt?.trim() ?? "";
  if (!closedAt) return true;
  const closedCmp = compareAttributionInstants(committedAt, closedAt);
  return closedCmp != null && closedCmp < 0;
}

export function classifyShiftsCoveringCommitTime<
  T extends { openedAt: string; closedAt: string | null },
>(shifts: readonly T[], committedAt: string): ShiftCommitCoverage<T> {
  const hits = shifts.filter((shift) =>
    collectionFactCommitFallsInShiftWindow({
      committedAt,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
    })
  );
  if (hits.length === 0) return { kind: "none" };
  if (hits.length === 1) return { kind: "unique", shift: hits[0]! };
  return { kind: "ambiguous", shifts: hits };
}
