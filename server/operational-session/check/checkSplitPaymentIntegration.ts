/**
 * SPLIT-PAYMENT-INTEGRATION-1 — Check Aggregate orchestration for Split Payment.
 *
 * Sole mutation path: Check Aggregate → Domain commands → Repository
 * (+ Order Settlement via Check-owned OS integration only).
 *
 * Atomicity: all persistence participates in the caller’s SessionDbClient /
 * Check-owned transaction. No independent commits. Events are collected,
 * not published (same pattern as ORDER-SETTLEMENT-INTEGRATION-1).
 *
 * ADR-ARCH-020 / 021 / 022 / 023 / 024.
 */

import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import {
  allocatePayment,
  allocateTenders,
  authorizePayment,
  buildCheckFinancialResponsibility,
  cancelPayment,
  cancelPaymentAttempt,
  capturePayment,
  createSplitPayment,
  failPayment,
  failPaymentAttempt,
  isValueReceivedStatus,
  parseSplitPaymentMoney,
  refundPayment,
  startPaymentAttempt,
  succeedPaymentAttempt,
  updateOutstandingSnapshot,
  voidPayment,
  type CheckFinancialResponsibility,
  type PaymentAttempt,
  type PaymentPortion,
  type SplitPayment,
  type SplitPaymentCommandOutcome,
  type SplitPaymentDomainEvent,
  type TenderMethod,
} from "@shared/operational-session";
import {
  applyPartialSettlementForOrder,
  ensureOrderSettlementForEnrollment,
  type CheckOrderSettlementMutationResult,
} from "./checkOrderSettlementIntegration";
import { findCheckById } from "./checkRepository";
import { mapRowToOperationalCheck } from "./checkMapper";
import {
  findPaymentAttemptByIdentity,
  findSplitPaymentByIdentity,
  finalizePaymentAttemptOutcome,
  insertPaymentAttempt,
  insertSplitPayment,
  listPaymentAttemptsForCheck,
  listSplitPaymentsForCheck,
  SplitPaymentPersistenceError,
  updateSplitPayment,
  type PaymentAttemptLoadResult,
  type SplitPaymentLoadResult,
} from "./splitPaymentRepository";
import type { OperationalCheck } from "@shared/operational-session";

export type CheckSplitPaymentMutationResult = Readonly<{
  check: OperationalCheck;
  payment: SplitPayment | null;
  version: number | null;
  attempt: PaymentAttempt | null;
  outcome: SplitPaymentCommandOutcome;
  events: readonly SplitPaymentDomainEvent[];
  orderSettlement: CheckOrderSettlementMutationResult;
  outstanding: CheckFinancialResponsibility | null;
}>;

const EMPTY_OS: CheckOrderSettlementMutationResult = {
  settlements: [],
  events: [],
  outcomes: [],
};

function emptyResult(
  check: OperationalCheck,
  outcome: SplitPaymentCommandOutcome,
  payment: SplitPayment | null = null,
  version: number | null = null
): CheckSplitPaymentMutationResult {
  return {
    check,
    payment,
    version,
    attempt: null,
    outcome,
    events: [],
    orderSettlement: EMPTY_OS,
    outstanding: null,
  };
}

async function requireCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const row = await findCheckById(input.checkId, client);
  if (!row || row.restaurantId !== input.restaurantId) {
    throw new Error(
      `Check ${input.checkId} not found for restaurant ${input.restaurantId}`
    );
  }
  return mapRowToOperationalCheck(row);
}

function assertCheckOpen(check: OperationalCheck, operation: string): void {
  if (check.outcome !== "open") {
    throw new Error(
      `Cannot ${operation} on Check with outcome "${check.outcome}"`
    );
  }
}

function moneySnapshot(value: unknown): string {
  if (value == null) return "0.00";
  return String(value);
}

/** Applied Payment Value = sum of value-received Payments (I-SP / ADR-024). */
export function computeAppliedPaymentValue(
  payments: readonly SplitPayment[]
): string {
  let sum = 0;
  for (const p of payments) {
    if (isValueReceivedStatus(p.status)) {
      sum += parseSplitPaymentMoney(p.amount);
    }
  }
  return (Math.round((sum + Number.EPSILON) * 100) / 100).toFixed(2);
}

export async function loadCheckOutstanding(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<CheckFinancialResponsibility> {
  const check = await requireCheck(input, client);
  const loaded = await listSplitPaymentsForCheck(input, client);
  const payments = loaded.map((l) => l.payment);
  return buildCheckFinancialResponsibility({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    financialResponsibility: moneySnapshot(check.grandTotal),
    appliedPaymentValue: computeAppliedPaymentValue(payments),
  });
}

async function persistPaymentResult(
  previous: SplitPaymentLoadResult | null,
  payment: SplitPayment,
  outcome: SplitPaymentCommandOutcome,
  client?: SessionDbClient
): Promise<number> {
  if (outcome === "already_applied" || outcome === "no_change") {
    return previous?.version ?? 1;
  }
  if (!previous) {
    await insertSplitPayment(payment, client);
    return 1;
  }
  return updateSplitPayment(
    payment,
    { expectedVersion: previous.version },
    client
  );
}

async function applyNewAllocationsToOrderSettlements(
  before: SplitPayment,
  after: SplitPayment,
  client?: SessionDbClient
): Promise<CheckOrderSettlementMutationResult> {
  const beforeIds = new Set(before.allocations.map((a) => a.allocationId));
  const newly = after.allocations.filter((a) => !beforeIds.has(a.allocationId));
  if (newly.length === 0) return EMPTY_OS;

  const settlements: CheckOrderSettlementMutationResult["settlements"][number][] =
    [];
  const events: CheckOrderSettlementMutationResult["events"][number][] = [];
  const outcomes: CheckOrderSettlementMutationResult["outcomes"][number][] = [];

  for (const alloc of newly) {
    await ensureOrderSettlementForEnrollment(
      {
        restaurantId: after.restaurantId,
        checkId: after.checkId,
        orderId: alloc.orderId,
      },
      client
    );
    const os = await applyPartialSettlementForOrder(
      {
        restaurantId: after.restaurantId,
        checkId: after.checkId,
        orderId: alloc.orderId,
        coverageAmount: alloc.amount,
      },
      client
    );
    settlements.push(...os.settlements);
    events.push(...os.events);
    outcomes.push(...os.outcomes);
  }

  return { settlements, events, outcomes };
}

async function withOutstandingEvent(
  base: CheckSplitPaymentMutationResult,
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const outstanding = await loadCheckOutstanding(
    {
      restaurantId: base.check.restaurantId,
      checkId: base.check.id,
    },
    client
  );
  const snap = updateOutstandingSnapshot({
    restaurantId: outstanding.restaurantId,
    checkId: outstanding.checkId,
    financialResponsibility: outstanding.financialResponsibility,
    appliedPaymentValue: outstanding.appliedPaymentValue,
    paymentId: base.payment?.paymentId ?? null,
    financialReference: base.payment?.financialReference ?? null,
    at: formatDiningSessionTimestamp(),
  });
  return {
    ...base,
    outstanding: snap.responsibility,
    events: [...base.events, ...snap.events],
  };
}

// ─── Commands ───────────────────────────────────────────────────────

export async function createPaymentOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
    paymentReference: string;
    financialReference?: string | null;
    amount: string;
    initialStatus?: "pending" | "authorized" | "captured";
    tenders?: readonly {
      tenderId: string;
      method: TenderMethod;
      amount: string;
    }[];
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const check = await requireCheck(input, client);
  assertCheckOpen(check, "createPayment");

  const existing = await findSplitPaymentByIdentity(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      paymentId: input.paymentId,
    },
    client
  );
  if (existing) {
    return emptyResult(check, "already_applied", existing.payment, existing.version);
  }

  const outstanding = await loadCheckOutstanding(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );
  const onCheck = await listSplitPaymentsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );

  const created = createSplitPayment({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    paymentId: input.paymentId,
    paymentReference: input.paymentReference,
    financialReference: input.financialReference ?? null,
    amount: input.amount,
    checkRestaurantId: check.restaurantId,
    outstandingBalance: outstanding.outstandingBalance,
    initialStatus: input.initialStatus,
    tenders: input.tenders,
    existingPaymentIds: onCheck.map((p) => p.payment.paymentId),
    at: formatDiningSessionTimestamp(),
  });

  try {
    const version = await persistPaymentResult(null, created.payment, created.outcome, client);
    let result: CheckSplitPaymentMutationResult = {
      check,
      payment: created.payment,
      version,
      attempt: null,
      outcome: created.outcome,
      events: created.events,
      orderSettlement: EMPTY_OS,
      outstanding: null,
    };
    if (
      created.payment.status === "captured" ||
      isValueReceivedStatus(created.payment.status)
    ) {
      result = await withOutstandingEvent(result, client);
    }
    return result;
  } catch (err) {
    if (
      err instanceof SplitPaymentPersistenceError &&
      err.code === "DUPLICATE"
    ) {
      const raced = await findSplitPaymentByIdentity(
        {
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          paymentId: input.paymentId,
        },
        client
      );
      if (raced) {
        return emptyResult(check, "already_applied", raced.payment, raced.version);
      }
    }
    throw err;
  }
}

async function mutateExistingPayment(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  },
  operation: string,
  apply: (
    loaded: SplitPaymentLoadResult,
    check: OperationalCheck,
    outstanding: CheckFinancialResponsibility
  ) => Promise<{
    outcome: SplitPaymentCommandOutcome;
    payment: SplitPayment;
    events: readonly SplitPaymentDomainEvent[];
    orderSettlement?: CheckOrderSettlementMutationResult;
    refreshOutstanding?: boolean;
  }>,
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const check = await requireCheck(input, client);
  assertCheckOpen(check, operation);

  const loaded = await findSplitPaymentByIdentity(input, client);
  if (!loaded) {
    throw new Error(`SplitPayment not found: ${input.paymentId}`);
  }

  const outstanding = await loadCheckOutstanding(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );

  const domain = await apply(loaded, check, outstanding);
  const version = await persistPaymentResult(
    loaded,
    domain.payment,
    domain.outcome,
    client
  );

  let result: CheckSplitPaymentMutationResult = {
    check,
    payment: domain.payment,
    version,
    attempt: null,
    outcome: domain.outcome,
    events: domain.events,
    orderSettlement: domain.orderSettlement ?? EMPTY_OS,
    outstanding: null,
  };

  if (
    domain.outcome === "applied" &&
    (domain.refreshOutstanding ||
      isValueReceivedStatus(domain.payment.status) ||
      (domain.orderSettlement?.outcomes.length ?? 0) > 0)
  ) {
    result = await withOutstandingEvent(result, client);
  }

  return result;
}

export async function authorizePaymentOnCheck(
  input: { restaurantId: number; checkId: number; paymentId: string },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "authorizePayment",
    async (loaded) => {
      const r = authorizePayment({
        payment: loaded.payment,
        at: formatDiningSessionTimestamp(),
      });
      return r;
    },
    client
  );
}

export async function capturePaymentOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
    tenders?: readonly {
      tenderId: string;
      method: TenderMethod;
      amount: string;
    }[];
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "capturePayment",
    async (loaded, _check, outstanding) => {
      const r = capturePayment({
        payment: loaded.payment,
        outstandingBalance: outstanding.outstandingBalance,
        tenders: input.tenders,
        at: formatDiningSessionTimestamp(),
      });
      return { ...r, refreshOutstanding: r.outcome === "applied" };
    },
    client
  );
}

export async function applyPaymentOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
    portions: readonly PaymentPortion[];
    allocationIds: readonly string[];
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "applyPayment",
    async (loaded) => {
      const before = loaded.payment;
      const r = allocatePayment({
        payment: before,
        portions: input.portions,
        allocationIds: input.allocationIds,
        at: formatDiningSessionTimestamp(),
      });
      if (r.outcome !== "applied") {
        return { ...r, orderSettlement: EMPTY_OS };
      }
      const orderSettlement = await applyNewAllocationsToOrderSettlements(
        before,
        r.payment,
        client
      );
      return {
        ...r,
        orderSettlement,
        refreshOutstanding: true,
      };
    },
    client
  );
}

export async function allocateTendersOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
    allocations: readonly {
      tenderAllocationId: string;
      tenderId: string;
      amount: string;
    }[];
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "allocateTenders",
    async (loaded) =>
      allocateTenders({
        payment: loaded.payment,
        allocations: input.allocations,
        at: formatDiningSessionTimestamp(),
      }),
    client
  );
}

export async function failPaymentOnCheck(
  input: { restaurantId: number; checkId: number; paymentId: string },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "failPayment",
    async (loaded) =>
      failPayment({
        payment: loaded.payment,
        at: formatDiningSessionTimestamp(),
      }),
    client
  );
}

export async function cancelPaymentOnCheck(
  input: { restaurantId: number; checkId: number; paymentId: string },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "cancelPayment",
    async (loaded) =>
      cancelPayment({
        payment: loaded.payment,
        at: formatDiningSessionTimestamp(),
      }),
    client
  );
}

export async function voidPaymentOnCheck(
  input: { restaurantId: number; checkId: number; paymentId: string },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "voidPayment",
    async (loaded) => {
      const r = voidPayment({
        payment: loaded.payment,
        at: formatDiningSessionTimestamp(),
      });
      return { ...r, refreshOutstanding: r.outcome === "applied" };
    },
    client
  );
}

export async function refundPaymentOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
    refundedAmount?: string;
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  return mutateExistingPayment(
    input,
    "refundPayment",
    async (loaded) => {
      const r = refundPayment({
        payment: loaded.payment,
        refundedAmount: input.refundedAmount,
        at: formatDiningSessionTimestamp(),
      });
      return { ...r, refreshOutstanding: r.outcome === "applied" };
    },
    client
  );
}

// ─── Payment Attempts (historical) ──────────────────────────────────

export async function startPaymentAttemptOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    attemptId: string;
    amount: string;
    method: TenderMethod;
    paymentId?: string | null;
    externalProviderReference?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const check = await requireCheck(input, client);
  assertCheckOpen(check, "startPaymentAttempt");

  const existing = await findPaymentAttemptByIdentity(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      attemptId: input.attemptId,
    },
    client
  );
  if (existing) {
    return {
      ...emptyResult(check, "already_applied"),
      attempt: existing.attempt,
    };
  }

  const existingAttempts = await listPaymentAttemptsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );
  const started = startPaymentAttempt({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    attemptId: input.attemptId,
    amount: input.amount,
    method: input.method,
    paymentId: input.paymentId ?? null,
    existingAttemptIds: existingAttempts.map((a) => a.attempt.attemptId),
    at: formatDiningSessionTimestamp(),
  });

  try {
    await insertPaymentAttempt(
      started.attempt,
      { externalProviderReference: input.externalProviderReference ?? null },
      client
    );
  } catch (err) {
    if (
      err instanceof SplitPaymentPersistenceError &&
      err.code === "DUPLICATE"
    ) {
      const raced = await findPaymentAttemptByIdentity(
        {
          restaurantId: input.restaurantId,
          checkId: input.checkId,
          attemptId: input.attemptId,
        },
        client
      );
      if (raced) {
        return {
          ...emptyResult(check, "already_applied"),
          attempt: raced.attempt,
        };
      }
    }
    throw err;
  }

  return {
    check,
    payment: null,
    version: null,
    attempt: started.attempt,
    outcome: started.outcome,
    events: started.events,
    orderSettlement: EMPTY_OS,
    outstanding: null,
  };
}

export async function failPaymentAttemptOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    attemptId: string;
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const check = await requireCheck(input, client);
  const loaded = await findPaymentAttemptByIdentity(input, client);
  if (!loaded) {
    throw new Error(`PaymentAttempt not found: ${input.attemptId}`);
  }
  const previousStatus = loaded.attempt.status;
  const failed = failPaymentAttempt({
    attempt: loaded.attempt,
    at: formatDiningSessionTimestamp(),
  });
  if (failed.outcome === "applied") {
    await finalizePaymentAttemptOutcome(
      failed.attempt,
      { expectedStatus: previousStatus },
      client
    );
  }
  return {
    check,
    payment: null,
    version: null,
    attempt: failed.attempt,
    outcome: failed.outcome,
    events: failed.events,
    orderSettlement: EMPTY_OS,
    outstanding: null,
  };
}

export async function cancelPaymentAttemptOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    attemptId: string;
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const check = await requireCheck(input, client);
  const loaded = await findPaymentAttemptByIdentity(input, client);
  if (!loaded) {
    throw new Error(`PaymentAttempt not found: ${input.attemptId}`);
  }
  const previousStatus = loaded.attempt.status;
  const cancelled = cancelPaymentAttempt({
    attempt: loaded.attempt,
    at: formatDiningSessionTimestamp(),
  });
  if (cancelled.outcome === "applied") {
    await finalizePaymentAttemptOutcome(
      cancelled.attempt,
      { expectedStatus: previousStatus },
      client
    );
  }
  return {
    check,
    payment: null,
    version: null,
    attempt: cancelled.attempt,
    outcome: cancelled.outcome,
    events: cancelled.events,
    orderSettlement: EMPTY_OS,
    outstanding: null,
  };
}

/**
 * Bind a succeeded attempt to an existing Payment inside the same Check tx.
 * Does not invent a Payment — caller creates/captures Payment separately when needed.
 */
export async function succeedPaymentAttemptOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    attemptId: string;
    paymentId: string;
    externalProviderReference?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckSplitPaymentMutationResult> {
  const check = await requireCheck(input, client);
  assertCheckOpen(check, "succeedPaymentAttempt");

  const loadedAttempt = await findPaymentAttemptByIdentity(input, client);
  if (!loadedAttempt) {
    throw new Error(`PaymentAttempt not found: ${input.attemptId}`);
  }
  const loadedPayment = await findSplitPaymentByIdentity(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      paymentId: input.paymentId,
    },
    client
  );
  if (!loadedPayment) {
    throw new Error(`SplitPayment not found: ${input.paymentId}`);
  }

  const previousStatus = loadedAttempt.attempt.status;
  const succeeded = succeedPaymentAttempt({
    attempt: loadedAttempt.attempt,
    payment: loadedPayment.payment,
    at: formatDiningSessionTimestamp(),
  });
  if (succeeded.outcome === "applied") {
    await finalizePaymentAttemptOutcome(
      succeeded.attempt,
      {
        expectedStatus: previousStatus,
        externalProviderReference: input.externalProviderReference ?? null,
      },
      client
    );
  }

  return {
    check,
    payment: loadedPayment.payment,
    version: loadedPayment.version,
    attempt: succeeded.attempt,
    outcome: succeeded.outcome,
    events: succeeded.events,
    orderSettlement: EMPTY_OS,
    outstanding: null,
  };
}

export async function loadSplitPaymentsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<readonly SplitPaymentLoadResult[]> {
  return listSplitPaymentsForCheck(input, client);
}

export async function loadPaymentAttemptsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<readonly PaymentAttemptLoadResult[]> {
  return listPaymentAttemptsForCheck(input, client);
}
