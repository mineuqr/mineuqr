/**
 * ADR-ARCH-024 / SPLIT-PAYMENT-DOMAIN-1 — Split Payment domain contracts.
 *
 * Check-owned FSP capability. NOT an Aggregate Root. NOT Tender Aggregate Root.
 * Pure domain types only — no persistence / ORM / API concerns.
 *
 * Identity governance: domain identities are stable opaque strings, independent
 * of persistence surrogates and transport eventIds. State transitions never
 * change PaymentId / AttemptId / AllocationId.
 */

export const SPLIT_PAYMENT_PROGRAM_ID = "SPLIT-PAYMENT-DOMAIN-1" as const;
export const SPLIT_PAYMENT_ADR_ID = "ADR-ARCH-024" as const;

/** Canonical Payment lifecycle (ADR-024 §5 / DOMAIN-1). */
export const SPLIT_PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "captured",
  "partially_applied",
  "applied",
  "cancelled",
  "voided",
  "refunded",
  "failed",
] as const;

export type SplitPaymentStatus = (typeof SPLIT_PAYMENT_STATUSES)[number];

export const SPLIT_PAYMENT_NON_TERMINAL_STATUSES = [
  "pending",
  "authorized",
  "captured",
  "partially_applied",
] as const;

export type SplitPaymentNonTerminalStatus =
  (typeof SPLIT_PAYMENT_NON_TERMINAL_STATUSES)[number];

/** Terminal at Payment level — never implies Check Financial Settlement. */
export const SPLIT_PAYMENT_TERMINAL_STATUSES = [
  "applied",
  "cancelled",
  "voided",
  "refunded",
  "failed",
] as const;

export type SplitPaymentTerminalStatus =
  (typeof SPLIT_PAYMENT_TERMINAL_STATUSES)[number];

/** Payment-level success terminal (Payment Completion) — never Check Financial Settlement. */
export const SPLIT_PAYMENT_SUCCESS_TERMINAL_STATUSES = ["applied"] as const;

export type SplitPaymentSuccessTerminalStatus =
  (typeof SPLIT_PAYMENT_SUCCESS_TERMINAL_STATUSES)[number];

/** Capture+ implies Payment Success (value received) but not Financial Settlement. */
export const SPLIT_PAYMENT_VALUE_RECEIVED_STATUSES = [
  "captured",
  "partially_applied",
  "applied",
] as const;

export type TenderMethod =
  | "cash"
  | "visa"
  | "mastercard"
  | "mada"
  | "apple_pay"
  | "stc_pay"
  | "bank_transfer"
  | "complimentary"
  | "other";

export const TENDER_METHODS: readonly TenderMethod[] = [
  "cash",
  "visa",
  "mastercard",
  "mada",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
  "complimentary",
  "other",
] as const;

// ─── Identity value objects (stable across lifecycle) ───────────────

/** Stable domain Payment identity — never changes across auth/capture/apply/refund/void. */
export type PaymentId = string;

/** Independent attempt identity; traceable to parent Payment when linked. */
export type PaymentAttemptId = string;

export type TenderId = string;

export type TenderAllocationId = string;

export type PaymentAllocationId = string;

/**
 * Opaque business reference for a Payment (caller-supplied or domain-issued).
 * Independent from persistence PK and transport eventId.
 */
export type PaymentReference = string;

/**
 * Opaque financial correlation reference (Check-scoped business fact key).
 * Used for ADR-021 business idempotency — not a transport id.
 */
export type FinancialReference = string;

export type SplitPaymentIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: PaymentId;
}>;

/**
 * Tender — instrument line realizing Payment value.
 * Domain entity under Check; persistence mapping is out of scope.
 */
export type Tender = Readonly<{
  tenderId: TenderId;
  restaurantId: number;
  checkId: number;
  paymentId: PaymentId;
  method: TenderMethod;
  amount: string;
  createdAt: string;
}>;

/** Maps a Tender slice when multi-instrument decomposition is required. */
export type TenderAllocation = Readonly<{
  tenderAllocationId: TenderAllocationId;
  restaurantId: number;
  checkId: number;
  paymentId: PaymentId;
  tenderId: TenderId;
  amount: string;
  createdAt: string;
}>;

/**
 * Payment Portion — operator/guest slice of a Payment designated for allocation.
 * Not a monetary root; becomes Payment Allocation fact(s).
 */
export type PaymentPortion = Readonly<{
  portionId: string;
  paymentId: PaymentId;
  amount: string;
  /** Optional Order Settlement target hint (Check applies via OS commands). */
  orderId: number | null;
}>;

/**
 * Settlement Portion — coverage applied toward an Order Settlement identity.
 * Domain records the intended fact; Check Aggregate owns OS mutation.
 * Does not embed or mutate Order Aggregate.
 */
export type SettlementPortion = Readonly<{
  allocationId: PaymentAllocationId;
  restaurantId: number;
  checkId: number;
  paymentId: PaymentId;
  orderId: number;
  amount: string;
  createdAt: string;
}>;

/** Alias: Payment Allocation is the Settlement Portion fact under Payment. */
export type PaymentAllocation = SettlementPortion;

/** Outstanding Portion — remaining Check responsibility after applied Payments. */
export type OutstandingPortion = Readonly<{
  restaurantId: number;
  checkId: number;
  outstandingBalance: string;
}>;

/**
 * Payment Completion — Payment-level successful receive/allocate terminal.
 * NEVER implies Check Financial Settlement (I-SP-06).
 */
export type PaymentCompletion = Readonly<{
  paymentId: PaymentId;
  status: "applied";
  amount: string;
  impliesFinancialSettlement: false;
}>;

/**
 * Financial Completion — Check Aggregate exclusive concept (fact input only).
 * Domain records awareness; never produces this from Payment commands.
 */
export type FinancialCompletion = Readonly<{
  checkId: number;
  restaurantId: number;
  outstandingBalance: "0.00";
  /** Must be achieved by Check settle — never by Payment Completion alone. */
  achievedByCheckSettleCommand: true;
}>;

/**
 * Payment — Check-owned financial entity (NOT Aggregate Root).
 * Finality: Payment Completion ≠ Check Financial Settlement (I-SP-06).
 */
export type SplitPayment = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: PaymentId;
  /** Stable business reference for this Payment. */
  paymentReference: PaymentReference;
  /** Optional Check-scoped financial correlation key (ADR-021 business fact). */
  financialReference: FinancialReference | null;
  status: SplitPaymentStatus;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  tenders: readonly Tender[];
  tenderAllocations: readonly TenderAllocation[];
  allocations: readonly PaymentAllocation[];
  /**
   * Always false from Payment domain commands.
   * Financial Settlement is owned exclusively by Check Aggregate settle commands.
   */
  impliesFinancialSettlement: false;
  createdAt: string;
  updatedAt: string;
}>;

export type PaymentAttemptStatus =
  | "started"
  | "succeeded"
  | "failed"
  | "cancelled";

export type PaymentAttempt = Readonly<{
  restaurantId: number;
  checkId: number;
  attemptId: PaymentAttemptId;
  /** Parent Payment when attempt is linked; null until success creates/binds Payment. */
  paymentId: PaymentId | null;
  status: PaymentAttemptStatus;
  amount: string;
  method: TenderMethod;
  createdAt: string;
  updatedAt: string;
}>;

/** Check-scope outstanding snapshot (inputs from Check Aggregate). */
export type CheckFinancialResponsibility = Readonly<{
  restaurantId: number;
  checkId: number;
  financialResponsibility: string;
  appliedPaymentValue: string;
  outstandingBalance: string;
}>;

export function isSplitPaymentStatus(value: string): value is SplitPaymentStatus {
  return (SPLIT_PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function assertSplitPaymentStatus(
  value: string
): asserts value is SplitPaymentStatus {
  if (!isSplitPaymentStatus(value)) {
    throw new Error(`Invalid SplitPaymentStatus: ${value}`);
  }
}

export function isSplitPaymentTerminalStatus(
  status: SplitPaymentStatus
): status is SplitPaymentTerminalStatus {
  return (SPLIT_PAYMENT_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export function isSplitPaymentNonTerminalStatus(
  status: SplitPaymentStatus
): status is SplitPaymentNonTerminalStatus {
  return (SPLIT_PAYMENT_NON_TERMINAL_STATUSES as readonly string[]).includes(
    status
  );
}

export function isValueReceivedStatus(status: SplitPaymentStatus): boolean {
  return (SPLIT_PAYMENT_VALUE_RECEIVED_STATUSES as readonly string[]).includes(
    status
  );
}

export function isTenderMethod(value: string): value is TenderMethod {
  return (TENDER_METHODS as readonly string[]).includes(value);
}
