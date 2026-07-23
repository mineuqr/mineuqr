# SETTLEMENT-RECORD-PLATFORM-1 — Detailed Technical Design

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-RECORD-PLATFORM-1 |
| **Phase** | Architecture Decision + Detailed Technical Design |
| **Date** | 2026-07-23 |
| **Constitutional ADR** | [ADR-ARCH-026 — Settlement Record Platform](../../architecture/adrs/ADR-ARCH-026-settlement-record-platform.md) |
| **Status** | Architecture complete — **READY FOR IMPLEMENTATION** (successor programs only) |
| **Implementation** | **Forbidden in this program** |

> **Numbering note:** Program brief requested `ADR-ARCH-023-Settlement-Record-Platform.md`.  
> **ADR-ARCH-023 is already** Financial Core Capabilities and MUST NOT be overwritten.  
> Settlement Record is ratified as **ADR-ARCH-026**.

---

## 1. Purpose of this design

Translate ADR-ARCH-026 into an implementable technical design for MineuQR’s multi-tenant Financial Settlement Platform — without writing code, schema, or APIs in this program.

Settlement Record is the **Canonical Financial Document** produced by the Check Aggregate.

---

## 2. Ownership model (constitutional)

### 2.1 Business Ownership (unchanged)

```
Table  ──────────────► Session
Waiter ──────────────► Session
QR Ordering ─────────► Order
Self Ordering ───────► Order
Kiosk ───────────────► Order
```

### 2.2 Financial Production / Authority (unchanged)

```
Check Aggregate = sole monetary Aggregate Root
                = Financial Producer of Settlement Record
                = Financial Authority for Revenue
```

### 2.3 Financial Publication (new)

```
Settlement Record = Immutable Financial Document
                  = Published Financial Fact
                  ≠ Aggregate Root
                  ≠ calculator
                  ≠ workflow owner
```

---

## 3. Component map

| Component | Boundary | Settlement Record relationship |
|-----------|----------|--------------------------------|
| Session | Ops Aggregate | Optional correlation; Mark Paid façade |
| Order | Ops Aggregate | Referenced via enrollment; never owns Record |
| Check | Monetary Aggregate Root | Creates Record in finalize TX |
| Settlement Record | Immutable Document | Publication artifact |
| SettlementTransaction | Check child | Tender source for payment snapshot |
| Order Settlement | Check entity | Order-level state; referenced, not replaced |
| Split Payment | Check capability | Dormant UI; never alone creates Record |
| Multi Check Allocation | Check capability | Dormant UI; never alone creates Record |
| Reporting | Read consumer | Dual-run → cutover to Record publication |
| Projection / API / UI | Presentation / read | Zero money math; consume published facts |

---

## 4. Lifecycle design

```
[Check open]
    │ recalculate / enroll / tenders / OS / SP / MCA (as applicable)
    ▼
[Check financial finalization TX]  ← single financial transaction
    │ 1. Finalize Check outcome + freeze money/tax/currency
    │ 2. Persist SettlementTransaction[]
    │ 3. Apply Order Settlement terminal transitions
    │ 4. Create Settlement Record (copy snapshots)     ← SR-INV-04
    │ 5. Collect SettlementRecordCreated (ADR-021)
    ▼
[COMMIT]
    │
    ├─► Session façade may close visit (separate ops TX; not money authority)
    ├─► Optional Projection materialize (soft; never invents Record)
    └─► Reporting pull (dual-run / cutover)
```

**Corrections:** append compensating Settlement Record (`refund` / `void` / `reversal` / `correction`) linked via `priorSettlementRecordId`. Never UPDATE money on the original.

---

## 5. Canonical field catalog (design)

See ADR-ARCH-026 §9 for the constitutional field groups.

Implementation programs MUST:

1. Treat all money fields as opaque copied strings/decimals from Check freeze.  
2. Enforce uniqueness on `(restaurantId, checkId, recordKind, recordGeneration)` (or equivalent).  
3. Store tax/currency snapshots as immutable JSON/document blobs copied from Check.  
4. Require `restaurantId` on every row and every query predicate.

---

## 6. Event design

| Event | v1 | Publisher | Consumers |
|-------|----|-----------|-----------|
| `SettlementRecordCreated` | Required | Check Aggregate | Claims / future projection / audit |
| `SettlementRecordRefunded` | Future | Check Aggregate | Same |
| `SettlementRecordVoided` | Future | Check Aggregate | Same |
| `SettlementRecordCorrected` | Future | Check Aggregate | Same |

Replay: rebuild readers from Settlement Record persistence (authoritative document store), not from UI cache.

---

## 7. Persistence decision (detailed)

**Chosen:** Append-only immutable write-model document co-committed with Check finalize.

| Requirement | Why write-model document |
|-------------|--------------------------|
| SR-INV-04 atomicity | Same TX as Check |
| SR-INV-02 immutability | No UPDATE path for money |
| SR-INV-06 forever history | Durable rows, not ephemeral projection |
| Reporting cutover | Stable published artifact |

Projection layer MAY later denormalize for list/query performance; it MUST NOT be the only copy of the document at finalize time.

---

## 8. Reporting migration design

| Phase | Engineering gate |
|-------|------------------|
| A Introduce | Record written; zero Reporting code path change |
| B Dual Run | Shadow metrics from Record vs Check/ST |
| C Parity | Automated diff = 0 for Revenue/tax/currency/tender counts |
| D Cutover | Feature flag flip Reporting adapters to Record |
| E Adoption | Dashboard / Excel / PDF / integrations |

**Rollback:** flag off → Check/ST reads restored instantly.

**Non-goals:** replacing Order Sales P-10; inventing Revenue = tender sum.

---

## 9. API design (future contracts only)

Public read procedures (names illustrative):

- `settlementRecord.getById`
- `settlementRecord.getByCheck`
- `settlementRecord.listByRestaurant`
- `settlementRecord.listBySession` (optional)

Internal only:

- Check finalize producer (no client “createSettlementRecord”)

Authorization: `verifiedProcedure` + restaurant access; tenant predicate mandatory.

---

## 10. Idempotency design

Aligned with ADR-ARCH-021:

| Layer | Mechanism |
|-------|-----------|
| Business | One Record per Check settle generation |
| Command | `applied` \| `already_applied` |
| Persistence | Unique constraint on business key |
| Transport | Event claim keys for consumers |

---

## 11. Security & multi-tenancy

- Every document carries `restaurantId`.  
- Cross-tenant Check/Session/Order references rejected at produce time.  
- Historical snapshots prevent settings-based rewriting across restaurants.

---

## 12. Terminology (program)

Use ADR-ARCH-026 §14 glossary exclusively in successor programs:

Business Owner · Financial Producer · Financial Authority · Settlement Record · Settlement Transaction · Order Settlement · Split Payment · Multi Check Allocation · Financial Publication · Canonical Financial Document · Published Financial Fact.

---

## 13. Successor implementation sequence

| Order | Program | Scope |
|------:|---------|-------|
| 1 | SETTLEMENT-RECORD-DOMAIN-1 | Contracts, identities, invariants (pure) |
| 2 | SETTLEMENT-RECORD-PERSISTENCE-1 | Append-only storage + migration |
| 3 | SETTLEMENT-RECORD-INTEGRATION-1 | Atomic create in Check finalize |
| 4 | SETTLEMENT-RECORD-PROJECTION-1 / API-1 | Reads |
| 5 | SETTLEMENT-RECORD-REPORTING-ADOPTION-1 | Dual-run / parity / cutover |

---

## 14. Traceability

| Artifact | Path |
|----------|------|
| Constitutional ADR | `docs/architecture/adrs/ADR-ARCH-026-settlement-record-platform.md` |
| This design | `docs/engineering/programs/SETTLEMENT-RECORD-PLATFORM-1/ARCHITECTURE.md` |
| Investigation | `docs/engineering/programs/SETTLEMENT-RECORD-PLATFORM-1/INVESTIGATION.md` |
| UI suspension (SP/MCA) | SETTLEMENT-UI-CLEANUP-1 · MCA PRODUCTION-ADOPTION-1 Rev 2.0 |

---

## 15. Final status

**READY FOR IMPLEMENTATION** — via successor programs only, under ADR-ARCH-026.

No code, schema, API, projection, reporting, or UI changes are authorized by this design document alone.
