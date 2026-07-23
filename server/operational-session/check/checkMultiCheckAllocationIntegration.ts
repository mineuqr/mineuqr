/**
 * MULTI-CHECK-ALLOCATION-INTEGRATION-1 — Check Aggregate orchestration for
 * Multi Check Allocation.
 *
 * Sole mutation path: Check Aggregate → Domain commands → Repository.
 *
 * ─── ATOMICITY GOVERNANCE ───────────────────────────────────────────
 * Every successful Allocation command MUST commit atomically under the
 * Check Aggregate’s SessionDbClient / transaction.
 *
 * The following either ALL succeed together or ALL roll back:
 *   • Check Aggregate command boundary (open + ownership validation)
 *   • Allocation persistence (header + children)
 *   • Allocation history append
 *   • Version increment (CAS)
 *   • Domain event collection (returned only after persist succeeds;
 *     never published from this layer)
 *
 * Partial persistence is prohibited.
 * No Allocation write may occur outside a Check-owned transaction client.
 * No history record may be appended without its Allocation state write
 * in the same client unit of work (repository enforces ordering).
 *
 * Mutation APIs REQUIRE SessionDbClient — they MUST NOT fall back to
 * an auto-commit connection (that would break multi-statement atomicity).
 *
 * ADR-ARCH-020 / 021 / 022 / 023 / 024 / 025.
 */

import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import {
  adjustAllocation,
  applyAllocation,
  cancelAllocation,
  completeAllocation,
  createMultiCheckAllocation,
  reserveAllocation,
  reverseAllocation,
  type CreateAllocationPortionInput,
  type CreateAllocationSourceInput,
  type MultiCheckAllocation,
  type MultiCheckAllocationCommandOutcome,
  type MultiCheckAllocationDomainEvent,
  type OperationalCheck,
} from "@shared/operational-session";
import { findCheckById } from "./checkRepository";
import { mapRowToOperationalCheck } from "./checkMapper";
import {
  findMultiCheckAllocationByIdentity,
  insertMultiCheckAllocation,
  listMultiCheckAllocationsForSourceCheck,
  MultiCheckAllocationPersistenceError,
  updateMultiCheckAllocation,
  type MultiCheckAllocationLoadResult,
} from "./multiCheckAllocationRepository";
import type { AllocationMutationType } from "./multiCheckAllocationMapper";

export type CheckMultiCheckAllocationMutationResult = Readonly<{
  check: OperationalCheck;
  allocation: MultiCheckAllocation | null;
  version: number | null;
  outcome: MultiCheckAllocationCommandOutcome;
  events: readonly MultiCheckAllocationDomainEvent[];
}>;

/**
 * ATOMICITY GOVERNANCE — mutation paths must join the Check-owned transaction.
 * Without a client, repository writes would use an auto-commit connection and
 * could partially persist header/children/history across statements.
 */
function requireCheckOwnedTxClient(
  client: SessionDbClient | undefined,
  operation: string
): SessionDbClient {
  if (!client) {
    throw new Error(
      `ATOMICITY: ${operation} requires Check-owned SessionDbClient; Allocation mutations must not open independent transactions`
    );
  }
  return client;
}

function emptyResult(
  check: OperationalCheck,
  outcome: MultiCheckAllocationCommandOutcome,
  allocation: MultiCheckAllocation | null = null,
  version: number | null = null
): CheckMultiCheckAllocationMutationResult {
  return {
    check,
    allocation,
    version,
    outcome,
    events: [],
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

/**
 * Persist Allocation Domain snapshot with CAS / idempotent outcomes.
 *
 * ATOMICITY: header + children + history + version CAS execute on the same
 * Check-owned SessionDbClient. Repository appends history only after Allocation
 * state write in that unit of work. Callers must supply `client` (enforced).
 * On any write failure the Check Aggregate transaction rolls back entirely —
 * partial Allocation / orphan history is prohibited.
 */
async function persistAllocationResult(
  previous: MultiCheckAllocationLoadResult | null,
  allocation: MultiCheckAllocation,
  outcome: MultiCheckAllocationCommandOutcome,
  options: {
    mutationType: AllocationMutationType;
    allocationReason?: string | null;
    targetCheckId?: number | null;
  },
  client: SessionDbClient
): Promise<number> {
  if (outcome === "already_applied" || outcome === "no_change") {
    return previous?.version ?? 1;
  }
  if (!previous) {
    await insertMultiCheckAllocation(
      allocation,
      {
        mutationType: options.mutationType,
        allocationReason: options.allocationReason ?? null,
        targetCheckId: options.targetCheckId ?? null,
      },
      client
    );
    return 1;
  }
  return updateMultiCheckAllocation(
    allocation,
    {
      expectedVersion: previous.version,
      mutationType: options.mutationType,
      allocationReason: options.allocationReason ?? null,
      targetCheckId: options.targetCheckId ?? null,
    },
    client
  );
}

// ─── Create ─────────────────────────────────────────────────────────

export async function createAllocationOnCheck(
  input: {
    restaurantId: number;
    /** Commanding Check — must match sourceCheckId (Check Aggregate ownership). */
    checkId: number;
    allocationId: string;
    allocationReference: string;
    financialReference?: string | null;
    sourceCheckId?: number;
    sourcePaymentId?: string | null;
    financialResponsibility: string;
    paymentValueCap?: string | null;
    portions: readonly CreateAllocationPortionInput[];
    sources?: readonly CreateAllocationSourceInput[];
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  const tx = requireCheckOwnedTxClient(client, "createAllocation");
  const check = await requireCheck(input, tx);
  assertCheckOpen(check, "createAllocation");

  const sourceCheckId = input.sourceCheckId ?? input.checkId;
  if (sourceCheckId !== input.checkId) {
    throw new Error(
      `createAllocation commanding checkId ${input.checkId} must equal sourceCheckId ${sourceCheckId}`
    );
  }

  const existing = await findMultiCheckAllocationByIdentity(
    {
      restaurantId: input.restaurantId,
      allocationId: input.allocationId,
    },
    tx
  );
  if (existing) {
    return emptyResult(
      check,
      "already_applied",
      existing.allocation,
      existing.version
    );
  }

  const onSource = await listMultiCheckAllocationsForSourceCheck(
    { restaurantId: input.restaurantId, sourceCheckId },
    tx
  );

  const created = createMultiCheckAllocation({
    restaurantId: input.restaurantId,
    checkRestaurantId: check.restaurantId,
    allocationId: input.allocationId,
    allocationReference: input.allocationReference,
    financialReference: input.financialReference ?? null,
    sourceCheckId,
    sourcePaymentId: input.sourcePaymentId ?? null,
    financialResponsibility: input.financialResponsibility,
    paymentValueCap: input.paymentValueCap ?? null,
    portions: input.portions,
    sources: input.sources,
    existingAllocationIds: onSource.map((a) => a.allocation.allocationId),
    at: formatDiningSessionTimestamp(),
  });

  try {
    // Persist + history + version before events are returned (atomic unit).
    const version = await persistAllocationResult(
      null,
      created.allocation,
      created.outcome,
      {
        mutationType: "create",
        allocationReason: input.allocationReason ?? null,
      },
      tx
    );
    return {
      check,
      allocation: created.allocation,
      version,
      outcome: created.outcome,
      events: created.events,
    };
  } catch (err) {
    if (
      err instanceof MultiCheckAllocationPersistenceError &&
      err.code === "DUPLICATE"
    ) {
      const raced = await findMultiCheckAllocationByIdentity(
        {
          restaurantId: input.restaurantId,
          allocationId: input.allocationId,
        },
        tx
      );
      if (raced) {
        return emptyResult(
          check,
          "already_applied",
          raced.allocation,
          raced.version
        );
      }
    }
    throw err;
  }
}

// ─── Mutate existing ────────────────────────────────────────────────

async function mutateExistingAllocation(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
  },
  operation: string,
  mutationType: AllocationMutationType,
  apply: (
    loaded: MultiCheckAllocationLoadResult,
    check: OperationalCheck
  ) => {
    outcome: MultiCheckAllocationCommandOutcome;
    allocation: MultiCheckAllocation;
    events: readonly MultiCheckAllocationDomainEvent[];
  },
  options?: {
    allocationReason?: string | null;
    targetCheckId?: number | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  const tx = requireCheckOwnedTxClient(client, operation);
  const check = await requireCheck(input, tx);
  assertCheckOpen(check, operation);

  const loaded = await findMultiCheckAllocationByIdentity(
    {
      restaurantId: input.restaurantId,
      allocationId: input.allocationId,
    },
    tx
  );
  if (!loaded) {
    throw new Error(`MultiCheckAllocation not found: ${input.allocationId}`);
  }

  // Commanding Check must be the Allocation source Check (ownership).
  if (loaded.allocation.sourceCheckId !== input.checkId) {
    throw new Error(
      `Cannot ${operation} Allocation ${input.allocationId} from Check ${input.checkId}; sourceCheckId is ${loaded.allocation.sourceCheckId}`
    );
  }

  const domain = apply(loaded, check);
  // Persist + history + version CAS before events are returned (atomic unit).
  const version = await persistAllocationResult(
    loaded,
    domain.allocation,
    domain.outcome,
    {
      mutationType,
      allocationReason: options?.allocationReason ?? null,
      targetCheckId: options?.targetCheckId ?? null,
    },
    tx
  );

  return {
    check,
    allocation: domain.allocation,
    version,
    outcome: domain.outcome,
    events: domain.events,
  };
}

export async function reserveAllocationOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  return mutateExistingAllocation(
    input,
    "reserveAllocation",
    "reserve",
    (loaded) =>
      reserveAllocation({
        allocation: loaded.allocation,
        at: formatDiningSessionTimestamp(),
      }),
    { allocationReason: input.allocationReason ?? null },
    client
  );
}

export async function applyAllocationOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  return mutateExistingAllocation(
    input,
    "applyAllocation",
    "apply",
    (loaded) =>
      applyAllocation({
        allocation: loaded.allocation,
        at: formatDiningSessionTimestamp(),
      }),
    { allocationReason: input.allocationReason ?? null },
    client
  );
}

export async function adjustAllocationOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
    adjustmentId: string;
    amount: string;
    direction: "increase" | "decrease";
    portionId?: string | null;
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  return mutateExistingAllocation(
    input,
    "adjustAllocation",
    "adjust",
    (loaded) =>
      adjustAllocation({
        allocation: loaded.allocation,
        adjustmentId: input.adjustmentId,
        amount: input.amount,
        direction: input.direction,
        portionId: input.portionId ?? null,
        at: formatDiningSessionTimestamp(),
      }),
    { allocationReason: input.allocationReason ?? null },
    client
  );
}

export async function reverseAllocationOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
    reversalId: string;
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  return mutateExistingAllocation(
    input,
    "reverseAllocation",
    "reverse",
    (loaded) =>
      reverseAllocation({
        allocation: loaded.allocation,
        reversalId: input.reversalId,
        at: formatDiningSessionTimestamp(),
      }),
    { allocationReason: input.allocationReason ?? null },
    client
  );
}

export async function completeAllocationOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  return mutateExistingAllocation(
    input,
    "completeAllocation",
    "complete",
    (loaded) =>
      completeAllocation({
        allocation: loaded.allocation,
        at: formatDiningSessionTimestamp(),
      }),
    { allocationReason: input.allocationReason ?? null },
    client
  );
}

export async function cancelAllocationOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    allocationId: string;
    allocationReason?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckMultiCheckAllocationMutationResult> {
  return mutateExistingAllocation(
    input,
    "cancelAllocation",
    "cancel",
    (loaded) =>
      cancelAllocation({
        allocation: loaded.allocation,
        at: formatDiningSessionTimestamp(),
      }),
    { allocationReason: input.allocationReason ?? null },
    client
  );
}

// ─── Reads (no transaction ownership) ───────────────────────────────

export async function loadAllocationsForSourceCheck(
  input: { restaurantId: number; sourceCheckId: number },
  client?: SessionDbClient
): Promise<readonly MultiCheckAllocationLoadResult[]> {
  return listMultiCheckAllocationsForSourceCheck(input, client);
}

export async function loadAllocationByIdentity(
  input: { restaurantId: number; allocationId: string },
  client?: SessionDbClient
): Promise<MultiCheckAllocationLoadResult | null> {
  return findMultiCheckAllocationByIdentity(input, client);
}
