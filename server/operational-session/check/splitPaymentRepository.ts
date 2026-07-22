/**
 * SPLIT-PAYMENT-PERSISTENCE-1 — Split Payment repository.
 *
 * Storage / retrieval / mapping / concurrency only.
 * MUST NOT evaluate lifecycle, calculate money, or enforce Domain invariants.
 *
 * Concurrency:
 * - Unique paymentId / paymentReference / attemptId / allocation ids (ADR-021).
 * - Payment updates use compare-and-set on `version` (`expectedVersion`).
 * - Payment Attempt outcome finalize uses CAS on `expectedStatus`.
 * - Optional `SessionDbClient` joins caller Check-owned transactions
 *   (repos never open/commit independent transactions).
 *
 * Payment Attempts are historical: insert + outcome finalize only.
 * Never delete / never reuse attemptId for a different external attempt.
 */

import { and, asc, eq, inArray } from "drizzle-orm";
import {
  checkSplitPaymentAllocations,
  checkSplitPaymentAttempts,
  checkSplitPayments,
  checkSplitPaymentTenderAllocations,
  checkSplitPaymentTenders,
  type SelectCheckSplitPaymentAllocation,
  type SelectCheckSplitPaymentTender,
  type SelectCheckSplitPaymentTenderAllocation,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { DiningSessionUnavailableError } from "../../diningSession/sessionTypes";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import type {
  PaymentAttempt,
  PaymentAttemptStatus,
  SplitPayment,
} from "@shared/operational-session";
import {
  getAttemptExternalProviderReference,
  mapRowToPaymentAttempt,
  mapRowsToSplitPayment,
  toPaymentAllocationInsertValues,
  toPaymentAttemptInsertValues,
  toPaymentAttemptOutcomeUpdateValues,
  toSplitPaymentInsertValues,
  toSplitPaymentUpdateValues,
  toTenderAllocationInsertValues,
  toTenderInsertValues,
} from "./splitPaymentMapper";

export class SplitPaymentPersistenceError extends Error {
  readonly code: "NOT_FOUND" | "CONFLICT" | "DUPLICATE" | "UNAVAILABLE";

  constructor(
    code: SplitPaymentPersistenceError["code"],
    message: string
  ) {
    super(message);
    this.name = "SplitPaymentPersistenceError";
    this.code = code;
  }
}

export type SplitPaymentLoadResult = Readonly<{
  payment: SplitPayment;
  version: number;
}>;

export type PaymentAttemptLoadResult = Readonly<{
  attempt: PaymentAttempt;
  /** Persistence-only provider correlation. */
  externalProviderReference: string | null;
  /** Surrogate ordering key (ascending = attempt order). */
  sequence: number;
}>;

async function resolveDb(client?: SessionDbClient): Promise<SessionDbClient> {
  if (client) return client;
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  return db;
}

function isMysqlDuplicateKeyError(error: unknown): boolean {
  const e = error as { code?: string | number; errno?: number; message?: string };
  return (
    e?.code === "ER_DUP_ENTRY" ||
    e?.errno === 1062 ||
    (typeof e?.message === "string" && e.message.includes("Duplicate"))
  );
}

async function loadChildren(
  db: SessionDbClient,
  paymentId: string
): Promise<{
  tenders: SelectCheckSplitPaymentTender[];
  tenderAllocations: SelectCheckSplitPaymentTenderAllocation[];
  allocations: SelectCheckSplitPaymentAllocation[];
}> {
  const [tenders, tenderAllocations, allocations] = await Promise.all([
    db
      .select()
      .from(checkSplitPaymentTenders)
      .where(eq(checkSplitPaymentTenders.paymentId, paymentId)),
    db
      .select()
      .from(checkSplitPaymentTenderAllocations)
      .where(eq(checkSplitPaymentTenderAllocations.paymentId, paymentId)),
    db
      .select()
      .from(checkSplitPaymentAllocations)
      .where(eq(checkSplitPaymentAllocations.paymentId, paymentId)),
  ]);
  return { tenders, tenderAllocations, allocations };
}

async function insertMissingChildren(
  db: SessionDbClient,
  payment: SplitPayment
): Promise<void> {
  for (const tender of payment.tenders) {
    try {
      await db
        .insert(checkSplitPaymentTenders)
        .values(toTenderInsertValues(tender));
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
    }
  }
  for (const alloc of payment.tenderAllocations) {
    try {
      await db
        .insert(checkSplitPaymentTenderAllocations)
        .values(toTenderAllocationInsertValues(alloc));
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
    }
  }
  for (const alloc of payment.allocations) {
    try {
      await db
        .insert(checkSplitPaymentAllocations)
        .values(toPaymentAllocationInsertValues(alloc));
    } catch (error) {
      if (!isMysqlDuplicateKeyError(error)) throw error;
    }
  }
}

export async function insertSplitPayment(
  payment: SplitPayment,
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  try {
    const result = await db
      .insert(checkSplitPayments)
      .values(toSplitPaymentInsertValues(payment, 1));
    const insertId = Number(result[0].insertId);
    if (!Number.isFinite(insertId) || insertId <= 0) {
      throw new DiningSessionUnavailableError(
        "check_split_payments insert did not return an id"
      );
    }
    await insertMissingChildren(db, payment);
    return insertId;
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      throw new SplitPaymentPersistenceError(
        "DUPLICATE",
        `SplitPayment already persisted for paymentId=${payment.paymentId}`
      );
    }
    throw error;
  }
}

export async function findSplitPaymentByIdentity(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  },
  client?: SessionDbClient
): Promise<SplitPaymentLoadResult | null> {
  const db = await resolveDb(client);
  const [header] = await db
    .select()
    .from(checkSplitPayments)
    .where(
      and(
        eq(checkSplitPayments.restaurantId, input.restaurantId),
        eq(checkSplitPayments.checkId, input.checkId),
        eq(checkSplitPayments.paymentId, input.paymentId)
      )
    )
    .limit(1);
  if (!header) return null;
  const children = await loadChildren(db, header.paymentId);
  return {
    payment: mapRowsToSplitPayment(
      header,
      children.tenders,
      children.tenderAllocations,
      children.allocations
    ),
    version: header.version,
  };
}

export async function existsSplitPayment(
  input: {
    restaurantId: number;
    checkId: number;
    paymentId: string;
  },
  client?: SessionDbClient
): Promise<boolean> {
  const found = await findSplitPaymentByIdentity(input, client);
  return found != null;
}

export async function listSplitPaymentsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<SplitPaymentLoadResult[]> {
  const db = await resolveDb(client);
  const headers = await db
    .select()
    .from(checkSplitPayments)
    .where(
      and(
        eq(checkSplitPayments.restaurantId, input.restaurantId),
        eq(checkSplitPayments.checkId, input.checkId)
      )
    );
  if (headers.length === 0) return [];

  const paymentIds = headers.map((h) => h.paymentId);
  const [tenders, tenderAllocations, allocations] = await Promise.all([
    db
      .select()
      .from(checkSplitPaymentTenders)
      .where(inArray(checkSplitPaymentTenders.paymentId, paymentIds)),
    db
      .select()
      .from(checkSplitPaymentTenderAllocations)
      .where(inArray(checkSplitPaymentTenderAllocations.paymentId, paymentIds)),
    db
      .select()
      .from(checkSplitPaymentAllocations)
      .where(inArray(checkSplitPaymentAllocations.paymentId, paymentIds)),
  ]);

  return headers.map((header) => ({
    payment: mapRowsToSplitPayment(
      header,
      tenders.filter((t) => t.paymentId === header.paymentId),
      tenderAllocations.filter((t) => t.paymentId === header.paymentId),
      allocations.filter((a) => a.paymentId === header.paymentId)
    ),
    version: header.version,
  }));
}

/**
 * Persist Payment Domain snapshot with optimistic concurrency on `version`.
 * Child facts are append-only (insert-if-absent by canonical id).
 */
export async function updateSplitPayment(
  payment: SplitPayment,
  options: { expectedVersion: number },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  const nextVersion = options.expectedVersion + 1;
  const result = await db
    .update(checkSplitPayments)
    .set(toSplitPaymentUpdateValues(payment, nextVersion))
    .where(
      and(
        eq(checkSplitPayments.restaurantId, payment.restaurantId),
        eq(checkSplitPayments.checkId, payment.checkId),
        eq(checkSplitPayments.paymentId, payment.paymentId),
        eq(checkSplitPayments.version, options.expectedVersion)
      )
    );

  const affected = Number(
    (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
  if (affected === 0) {
    const existing = await findSplitPaymentByIdentity(
      {
        restaurantId: payment.restaurantId,
        checkId: payment.checkId,
        paymentId: payment.paymentId,
      },
      client
    );
    if (!existing) {
      throw new SplitPaymentPersistenceError(
        "NOT_FOUND",
        `SplitPayment not found for paymentId=${payment.paymentId}`
      );
    }
    throw new SplitPaymentPersistenceError(
      "CONFLICT",
      `SplitPayment concurrency conflict: expected version ${options.expectedVersion}, found ${existing.version}`
    );
  }

  await insertMissingChildren(db, payment);
  return nextVersion;
}

/** Alias — persist current Domain snapshot with version CAS. */
export async function persistSplitPayment(
  payment: SplitPayment,
  options: { expectedVersion: number },
  client?: SessionDbClient
): Promise<number> {
  return updateSplitPayment(payment, options, client);
}

// ─── Payment Attempts (immutable historical records) ────────────

export async function insertPaymentAttempt(
  attempt: PaymentAttempt,
  options?: { externalProviderReference?: string | null },
  client?: SessionDbClient
): Promise<number> {
  const db = await resolveDb(client);
  try {
    const result = await db.insert(checkSplitPaymentAttempts).values(
      toPaymentAttemptInsertValues(
        attempt,
        options?.externalProviderReference ?? null
      )
    );
    const insertId = Number(result[0].insertId);
    if (!Number.isFinite(insertId) || insertId <= 0) {
      throw new DiningSessionUnavailableError(
        "check_split_payment_attempts insert did not return an id"
      );
    }
    return insertId;
  } catch (error) {
    if (isMysqlDuplicateKeyError(error)) {
      throw new SplitPaymentPersistenceError(
        "DUPLICATE",
        `PaymentAttempt already persisted for attemptId=${attempt.attemptId}`
      );
    }
    throw error;
  }
}

/**
 * Finalize outcome for an existing Payment Attempt.
 * Updates only status / paymentId bind / provider ref / updatedAt.
 * Identity, amount, method, and createdAt are immutable.
 */
export async function finalizePaymentAttemptOutcome(
  attempt: PaymentAttempt,
  options: {
    expectedStatus: PaymentAttemptStatus;
    externalProviderReference?: string | null;
  },
  client?: SessionDbClient
): Promise<void> {
  const db = await resolveDb(client);
  const result = await db
    .update(checkSplitPaymentAttempts)
    .set(
      toPaymentAttemptOutcomeUpdateValues(
        attempt,
        options.externalProviderReference ?? null
      )
    )
    .where(
      and(
        eq(checkSplitPaymentAttempts.attemptId, attempt.attemptId),
        eq(checkSplitPaymentAttempts.restaurantId, attempt.restaurantId),
        eq(checkSplitPaymentAttempts.checkId, attempt.checkId),
        eq(checkSplitPaymentAttempts.status, options.expectedStatus)
      )
    );

  const affected = Number(
    (result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
  );
  if (affected === 0) {
    const existing = await findPaymentAttemptByIdentity(
      {
        restaurantId: attempt.restaurantId,
        checkId: attempt.checkId,
        attemptId: attempt.attemptId,
      },
      client
    );
    if (!existing) {
      throw new SplitPaymentPersistenceError(
        "NOT_FOUND",
        `PaymentAttempt not found for attemptId=${attempt.attemptId}`
      );
    }
    throw new SplitPaymentPersistenceError(
      "CONFLICT",
      `PaymentAttempt concurrency conflict: expected status "${options.expectedStatus}", found "${existing.attempt.status}"`
    );
  }
}

export async function findPaymentAttemptByIdentity(
  input: {
    restaurantId: number;
    checkId: number;
    attemptId: string;
  },
  client?: SessionDbClient
): Promise<PaymentAttemptLoadResult | null> {
  const db = await resolveDb(client);
  const [row] = await db
    .select()
    .from(checkSplitPaymentAttempts)
    .where(
      and(
        eq(checkSplitPaymentAttempts.restaurantId, input.restaurantId),
        eq(checkSplitPaymentAttempts.checkId, input.checkId),
        eq(checkSplitPaymentAttempts.attemptId, input.attemptId)
      )
    )
    .limit(1);
  if (!row) return null;
  return {
    attempt: mapRowToPaymentAttempt(row),
    externalProviderReference: getAttemptExternalProviderReference(row),
    sequence: row.id,
  };
}

/** Historical attempts for a Check, ordered for audit (sequence ascending). */
export async function listPaymentAttemptsForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<PaymentAttemptLoadResult[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkSplitPaymentAttempts)
    .where(
      and(
        eq(checkSplitPaymentAttempts.restaurantId, input.restaurantId),
        eq(checkSplitPaymentAttempts.checkId, input.checkId)
      )
    )
    .orderBy(asc(checkSplitPaymentAttempts.id));
  return rows.map((row) => ({
    attempt: mapRowToPaymentAttempt(row),
    externalProviderReference: getAttemptExternalProviderReference(row),
    sequence: row.id,
  }));
}

/** Historical attempts linked to a parent Payment, ordered for audit. */
export async function listPaymentAttemptsForPayment(
  input: { restaurantId: number; checkId: number; paymentId: string },
  client?: SessionDbClient
): Promise<PaymentAttemptLoadResult[]> {
  const db = await resolveDb(client);
  const rows = await db
    .select()
    .from(checkSplitPaymentAttempts)
    .where(
      and(
        eq(checkSplitPaymentAttempts.restaurantId, input.restaurantId),
        eq(checkSplitPaymentAttempts.checkId, input.checkId),
        eq(checkSplitPaymentAttempts.paymentId, input.paymentId)
      )
    )
    .orderBy(asc(checkSplitPaymentAttempts.id));
  return rows.map((row) => ({
    attempt: mapRowToPaymentAttempt(row),
    externalProviderReference: getAttemptExternalProviderReference(row),
    sequence: row.id,
  }));
}
