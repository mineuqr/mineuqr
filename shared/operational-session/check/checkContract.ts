/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 —
 * Check sub-domain contracts (Operational Session Platform).
 *
 * Ownership:
 *   Operational Session
 *     └── Check  (own immutable id — never Session id)
 *
 * Check owns monetary state, settlement outcome, and immutable snapshots.
 * Check is NOT an Order, Invoice, Accounting document, or Projection.
 * Split Check (seat transfer) is out of scope.
 * Settlement tender lines: CHECK-SETTLEMENT-METHODS-1 (owned under Check).
 */

/** Operational settlement outcomes only — avoid "cancelled" (Order owns cancel). */
export const CHECK_OUTCOMES = [
  "open",
  "paid",
  "complimentary",
  "voided",
] as const;

export type CheckOutcome = (typeof CHECK_OUTCOMES)[number];

export const CHECK_TERMINAL_OUTCOMES = [
  "paid",
  "complimentary",
  "voided",
] as const;

export type CheckTerminalOutcome = (typeof CHECK_TERMINAL_OUTCOMES)[number];

export const CHECK_TAX_MODES = ["inclusive", "exclusive"] as const;

export type CheckTaxMode = (typeof CHECK_TAX_MODES)[number];

/**
 * Versioned tax policy snapshot — frozen on Check create.
 * v1 may contain a single component; structure supports multiple rates.
 */
export type TaxPolicySnapshotComponent = Readonly<{
  id: string;
  name: string;
  /** Decimal percent string, e.g. "15.00" */
  ratePercent: string;
}>;

export type TaxPolicySnapshot = Readonly<{
  /** Snapshot document version — increment when shape evolves. */
  version: number;
  enabled: boolean;
  mode: CheckTaxMode;
  components: readonly TaxPolicySnapshotComponent[];
}>;

/** Current TaxPolicySnapshot document version written by this platform. */
export const TAX_POLICY_SNAPSHOT_VERSION = 1 as const;

export type CurrencySnapshot = Readonly<{
  currencyCode: string;
  currencySymbol: string;
}>;

/**
 * Reserved — Service Charge Snapshot slot.
 * Implementation optional; null means not configured at Check create.
 */
export type ServiceChargeSnapshot = Readonly<{
  version: number;
  enabled: boolean;
  /** Decimal percent string when percentage-based; null when flat/unknown. */
  ratePercent: string | null;
  label: string | null;
}>;

export type TaxBreakdownLine = Readonly<{
  componentId: string;
  name: string;
  ratePercent: string;
  /** Tax amount attributable to this component. */
  amount: string;
}>;

export type TaxBreakdown = Readonly<{
  lines: readonly TaxBreakdownLine[];
  totalTaxAmount: string;
}>;

/**
 * Canonical Check aggregate projection (persistence: operational_checks).
 * id is immutable and distinct from sessionId.
 */
export type OperationalCheck = Readonly<{
  id: number;
  restaurantId: number;
  /** Null for sessionless Checks (kiosk/counter); set for table Session visits. */
  sessionId: number | null;
  outcome: CheckOutcome;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  /** Reserved; null until Service Charge feature ships. */
  serviceChargeSnapshot: ServiceChargeSnapshot | null;
  /** Bill-level discount only (line discounts stay on Orders). */
  billDiscountAmount: string;
  subtotal: string;
  taxAmount: string;
  taxBreakdown: TaxBreakdown;
  /** Operational amount payable. */
  grandTotal: string;
  snapshotsFrozenAt: string;
  totalsFrozenAt: string | null;
  settledAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export function isTerminalCheckOutcome(outcome: CheckOutcome): boolean {
  return (CHECK_TERMINAL_OUTCOMES as readonly string[]).includes(outcome);
}

export function isOpenCheckOutcome(outcome: CheckOutcome): boolean {
  return outcome === "open";
}

export function assertCheckOutcome(value: string): CheckOutcome {
  if (!(CHECK_OUTCOMES as readonly string[]).includes(value)) {
    throw new Error(`Invalid check outcome: ${value}`);
  }
  return value as CheckOutcome;
}

export function assertCheckTaxMode(value: string): CheckTaxMode {
  if (!(CHECK_TAX_MODES as readonly string[]).includes(value)) {
    throw new Error(`Invalid check tax mode: ${value}`);
  }
  return value as CheckTaxMode;
}
