# IMPLEMENTATION — ORDER-STATE-PROPAGATION-REMEDIATION-1

**Date:** 2026-07-29  
**Type:** Production Architecture Remediation  
**Constraint:** Deferred relay remains enabled. No domain / event / projection pipeline changes.

## Approach

Introduce **Read Freshness Governance** as a client cache merge policy:

1. On status mutation (`onMutate` / `onSuccess`), record a **write-confirmed status watermark**.
2. React Query `structuralSharing` merges incoming read payloads through governance.
3. While a confirmation is active, a lower-rank status (e.g. PREPARING) **cannot** replace a confirmed higher-rank status (e.g. READY).
4. When the read catches up (`status` rank ≥ confirmed), the watermark is released.
5. On mutation error, the watermark is cleared so snapshot rollback can restore prior state.

Canonical freshness indicator: **write-confirmed order status rank** (aligned with `OrderLifecyclePolicy` forward transitions). Projection `updatedAt` / `lastEventId` remain available on the server but are not required for this defect class once confirmation is present.

## Files

| Area | Path |
|---|---|
| Governance core | `shared/read-freshness/*` |
| listActive wiring | `client/src/lib/queryRuntime.ts` |
| Kitchen wiring | `client/src/lib/operational-screen/kitchen/useKitchenRuntimeStream.ts` |
| Confirmed writes | `useOrderStatusActions.ts`, `useOperationalDeviceOrderActions.ts` |
| Broadcast self-ignore | `orderLifecycleBroadcast.ts` |
| Customer poll | `CUSTOMER_ORDER_STATUS_POLL_MS = 3_000` |
| Tests | `shared/read-freshness/__tests__/readFreshnessGovernance.test.ts` |
| Guards | `server/order/observability/__tests__/orderStatePropagationRemediation.architecture.guards.test.ts` |

## Non-changes

- `awaitRelay: false` retained
- Outbox / consumers / materializers unchanged
- Aggregate / domain transitions unchanged
- No duplicate writes
