# REFUND-SETTLEMENT-RECORD-ADOPTION-1 — Settlement Record Adoption Report

| Field | Value |
|---|---|
| **Program** | REFUND-SETTLEMENT-RECORD-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. Settlement Record model (unchanged)

Settlement Record remains:

| Property | Status after adoption |
|----------|------------------------|
| Append only | Preserved |
| Immutable | Preserved |
| Chronological | Preserved (shared sort helpers) |
| Auditable | Preserved |

Every refund publication is **another Settlement Record** (`recordKind=refund`).

---

## 2. Compensating record adoption

| Field | Adopted |
|-------|---------|
| `recordKind=refund` | Yes — native kind |
| `priorSettlementRecordId` | Required; exposed on API |
| `recordGeneration` | Monotonic; exposed on API |
| Tenant isolation | Asserted in chain integrity |
| Timestamps | Copied from publish TX |
| Currency / tax / financial snapshots | Copied Check reverse snapshot |
| Original settlement mutation | Forbidden |

---

## 3. Read model adoption

| Consumer | Behavior |
|----------|----------|
| `getById` / `getByCheck` / `listBySession` / `listByRestaurant` | Returns refund gens — no kind strip |
| `recordKind` query filter | Includes `refund` |
| History / detail / receipt DTOs | Polymorphic status + chain fields |
| Presentation | Refunded label; receipt uses API `recordKind` |
| Session status panel | Polymorphic title when latest is refund |
| Reporting adapter | Still excludes compensating gens (documented handoff) |

**No refund-specific fork model.** Status derives from `recordKind` + outcome.

---

## 4. Query adoption

| Concern | Result |
|---------|--------|
| Refund participation | Included in Check/session/restaurant lists |
| Chronological ordering | Generation + createdAt sort helpers |
| Filtering | Deterministic `recordKind` / outcome filters |
| Pagination | Unchanged repository paging |
| History completeness | Full Check chain including refunds |

---

## 5. Event adoption

| Concern | Result |
|---------|--------|
| Publishers | Check Aggregate (Refund Domain compose) |
| Consumers | Collected facts; no bus materializer ignores refund |
| Idempotency | SR identity uniqueness + Refund `already_applied` |
| Duplicate projections | No accumulating SR projection exists; dup identity rejected in chain audit |

---

## 6. Immutability audit

| Proof | Evidence |
|-------|----------|
| Original never modified | Domain create-only; repo UPDATE/DELETE throw |
| Refund creates new records | `createCompensatingSettlementRecord` + insert |
| Historical chain intact | `assertSettlementRecordChainIntegrity` |

---

## 7. Consistency audit

| Check | Result |
|-------|--------|
| Totals | Copied snapshots; mapper does not recalculate |
| Generation ordering | Monotonic helpers |
| Parent linkage | `priorSettlementRecordId` |
| Chronological integrity | Sort + chain assert |
| Cross-tenant isolation | Chain reject on mixed `restaurantId` |
| Snapshot consistency | Currency/tax present on refund SR |

---

## 8. Compatibility audit

| Existing kind | Behavior |
|---------------|----------|
| Paid settlement | Unchanged (`settlementStatus=settled`) |
| Complimentary | Unchanged |
| Voided | Unchanged |
| Refund | Additive |

---

## 9. Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Operators see refund as “Settled” | High → Mitigated | Status label + mapper |
| Receipt hardcodes settlement | Medium → Mitigated | Receipt DTO `recordKind` |
| Reporting double-counts / ignores refunds silently | High | Explicit deferral to REFUND-REPORTING-ADOPTION-1 |
| Parallel refund store temptation | Critical | Fitness: single SR table/model |

---

## 10. Final Certification

**PRODUCTION CERTIFIED**
