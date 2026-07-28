# FINAL REPORT — ORDER-STATE-PROPAGATION-REMEDIATION-1

**Date:** 2026-07-29  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Prerequisites:** Latency forensics / instrumentation / remediation · State propagation forensics  

**Constraints honored:** No commit · No push · No deploy · Deferred relay retained

---

## 1. Executive Summary

Stale projection refetches can no longer visually regress a write-confirmed Ready status back to Preparing. Remediation is **client Read Freshness Governance** only: confirmed-write watermarks + React Query merge policy. Deferred relay, outbox, projections, and domain remain unchanged. Customer Tracking poll tightened to **3s** independently (write-model path).

---

## 2. Architecture Decision

**ADR-style decision:** Prevent cache regression at the **consumer merge boundary**, not by re-synchronizing projections on the HTTP path.

| Option | Rejected / Accepted |
|---|---|
| Restore `awaitRelay: true` | Rejected — violates latency remediation |
| Synchronous projections | Rejected |
| Bypass outbox / dual-write read model | Rejected |
| Client freshness governance + confirmed write watermark | **Accepted** |

---

## 3. Read Freshness Governance Specification

**Program constant:** `ORDER-STATE-PROPAGATION-REMEDIATION-1` (`READ_FRESHNESS_PROGRAM`)

**Principles enforced at cache merge:**

| Rule | Behavior |
|---|---|
| Fresh Read → Older Read | Accept |
| Confirmed Write → Older Read | Accept (optimistic / success path) |
| Older Read → Confirmed Write | **Reject** |
| Equal status | Accept (refresh fields) |
| Mutation error rollback | Clear confirmation → accept snapshot |

Rejected stale updates emit `[mineuqr:rfg] stale_rejected` when OLT logging is enabled.

---

## 4. Canonical Freshness Indicator Decision

| Candidate | Decision |
|---|---|
| Projection `updatedAt` / `lastEventId` | Exist on `order_read_orders`; **not exposed** on listActive DTO; not required for this fix |
| Mutation timestamps | Not returned by API |
| **Write-confirmed status + domain rank** | **Selected** — compatible with `OrderLifecyclePolicy` (Ready↛Preparing) |

Rank: `pending < preparing < ready < served|cancelled`.

---

## 5. Client Cache Merge Strategy

1. `confirmOrderStatusWrite(orderId, status)` on mutate/success  
2. Incoming list/queue payload merged via `mergeActiveOrderListCache` / `mergeKitchenQueueCache`  
3. If incoming status rank < confirmed → keep confirmed status (and kitchen column)  
4. If incoming rank ≥ confirmed → accept and **release** confirmation  
5. `clearOrderStatusWriteConfirmation` on error before snapshot restore  

---

## 6. React Query Changes

- `orderReadListQueryOptions` → `structuralSharing: activeOrderListStructuralSharing`  
- Kitchen `getKitchenQueue` → `structuralSharing: kitchenQueueStructuralSharing`  
- Optimistic `setData` unchanged; protection is confirmation + merge on refetch  

---

## 7. Polling Governance Changes

- Operational / kitchen **3s** polls unchanged; stale payloads now merge-safe while confirmation active  
- Customer poll **8s → 3s** (write-model; separate from projection governance)  

---

## 8. Broadcast Governance Changes

- Messages include `publisherId`  
- Subscribers **ignore self** by default → removes same-tab double-invalidate storm  
- Cross-tab observers still invalidate/refetch (eventual consistency)  

---

## 9. Customer Tracking Improvements

- `CUSTOMER_ORDER_STATUS_POLL_MS = 3_000`  
- Still reads live `orders` via `getPublicStatus` — not coupled to operational projection merge  

---

## 10. Observability Results

| Signal | Mechanism |
|---|---|
| Stale rejected | `[mineuqr:rfg] stale_rejected` + counters |
| Existing OLT marks | click → mutation → invalidate retained |
| Counters | `getReadFreshnessCounters()` accepted / rejectedStale / equal |

Live p50–p99 require post-deploy samples (not fabricated).

---

## 11. Performance Comparison

| Metric | Pre | Post |
|---|---|---|
| Status HTTP relay | Deferred | Deferred (unchanged) |
| Initiator Ready flicker | Possible | **Prevented** while confirmation active |
| Customer max poll lag | ≤8s | ≤3s |
| Same-tab BC invalidate | Double | Self ignored |

---

## 12. Compatibility Analysis

- Aggregate SSOT preserved  
- Event pipeline / outbox / projections unchanged  
- Latency remediation invariants retained (`awaitRelay: false`)  
- Error rollback still works (confirmation cleared)  

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Confirmation held if projection never catches up | Next equal/higher read releases; poll continues |
| Cross-device observers lag until projection | Expected eventual consistency; no false Ready→Preparing on initiator |
| Importing device target status helper | Existing client→server domain import pattern |

---

## 14. Validation Results

Run from repo root:

- `shared/read-freshness/__tests__/readFreshnessGovernance.test.ts`  
- `server/order/observability/__tests__/orderStatePropagationRemediation.architecture.guards.test.ts`  
- Existing latency remediation guards (deferred relay)  

---

## 15. Architecture Compliance Matrix

| Requirement | Status |
|---|---|
| READY never visually regresses after confirmed write | ✓ |
| Deferred relay enabled | ✓ |
| Latency improvements intact | ✓ |
| Aggregate SSOT | ✓ |
| Event pipeline unchanged | ✓ |
| Read model / projections unchanged | ✓ |
| No duplicate writes | ✓ |
| No sync projections | ✓ |
| No domain changes | ✓ |
| Customer converges | ✓ (faster poll) |
| Freshness governance platform standard | ✓ `shared/read-freshness` |

---

## 16. Production Readiness Report

**Code ready for Architecture Authority review.**  
Not committed, not pushed, not deployed.

**Smoke checklist after deploy:**

1. Mark Ready on Orders Workspace — UI stays Ready (no Preparing flash)  
2. Kitchen/Expo converge within ~3s after relay  
3. Customer tracking shows Ready within ~3s  
4. Failed mutation still rolls back UI  
5. Confirm `awaitRelay` still deferred in ops logs  

---

## Artifacts

- `docs/engineering/programs/ORDER-STATE-PROPAGATION-REMEDIATION-1/IMPLEMENTATION.md`  
- `docs/engineering/programs/ORDER-STATE-PROPAGATION-REMEDIATION-1/FINAL-REPORT.md`  
- `shared/read-freshness/`  

**Awaiting Architecture Authority approval.**
