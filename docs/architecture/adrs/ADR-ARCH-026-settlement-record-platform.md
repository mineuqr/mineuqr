# ADR-ARCH-026: Settlement Record Platform

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [← ADR-ARCH-024](./ADR-ARCH-024-split-payment-platform.md) · [← ADR-ARCH-025](./ADR-ARCH-025-multi-check-allocation-platform.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | SETTLEMENT-RECORD-PLATFORM-1 |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) |
| **Related ADRs** | ADR-ARCH-001 · 002 · 003 · 006 · 020 · 021 · 022 · 023 · 024 · 025 |
| **Related programs** | SETTLEMENT-RECORD-PLATFORM-1 (investigation + this ADR) · SETTLEMENT-UI-CLEANUP-1 · MULTI-CHECK-ALLOCATION-PRODUCTION-ADOPTION-1 Rev 2.0 · REPORTING-PLATFORM-ARCHITECTURE-1 · SETTLEMENT-RECORD-DOMAIN-1 (successor) |
| **Implementation status** | **Not implemented** — constitutional + program architecture only; no schema/API/runtime changes authorized by this ADR alone |
| **Numbering note** | Next FSP ADR after ADR-ARCH-025. **ADR-ARCH-023 remains Financial Core Capabilities** and MUST NOT be reused. |

---

## 1. Purpose

This ADR defines the **Settlement Record Platform** — the constitutional home of the **Canonical Financial Document** published when the Check Aggregate finalizes a financial settlement.

It answers:

> How does MineuQR publish a durable, immutable, tenant-isolated **Settlement Record** for Reporting, Dashboard, exports, analytics, tax history, and future financial integrations — without creating a second monetary Aggregate Root, without moving Business Ownership away from Session/Order channels, and without allowing Settlement Record to calculate or decide money?

This ADR authorizes **architecture publication only**. Runtime work requires successor programs (starting with `SETTLEMENT-RECORD-DOMAIN-1` / Persistence / Integration as sequenced by Architecture Authority).

---

## 2. Context (evidence)

### 2.1 Certified financial baseline

| Concern | Authority today | Evidence |
|---------|-----------------|----------|
| Monetary Aggregate Root / Revenue | **Check** | ADR-ARCH-020 I-FIN-01…05 |
| Tender / payment mix | **SettlementTransaction** under Check | CHECK-SETTLEMENT-METHODS-1 · Reporting ST adapter |
| Per-Order settlement state | **Order Settlement** under Check | ADR-ARCH-022 |
| Payment capability | **Split Payment** under Check | ADR-ARCH-024 · UI dormant (SETTLEMENT-UI-CLEANUP-1) |
| Cross-Check allocation | **Multi Check Allocation** under Check | ADR-ARCH-025 · UI dormant |
| Visit / table / waiter | **Dining Session** | Business Ownership |
| Placement / fulfilment | **Order** | Business Ownership · Order Sales via Order Read |
| Reporting Revenue / Tax | Reads paid Check | REPORTING SOURCE-OF-TRUTH |
| Reporting payment mix | Reads SettlementTransaction | Same |
| Reporting Order Sales | Order Read P-10 | Dual-metric law |

### 2.2 Gap

Consumers that need “a settlement happened” currently stitch:

- Check outcome + frozen totals  
- SettlementTransaction tender lines  
- Session `SESSION_PAID` / `SESSION_CLOSED` events  
- Optionally Order Settlement / Split Payment projections  

There is **no named Canonical Financial Document** that:

1. Is produced **atomically** with Check financial finalization.  
2. Is **append-only / immutable** for money.  
3. Preserves historical tax/currency forever independent of Business Settings.  
4. Can become the **published** SSOT for Reporting cutover without relocating financial authority away from Check.

Roadmap naming (“Settlement Record Platform”) must be constitutionalized before implementation.

### 2.3 Explicit non-goals of this ADR

- Implementing schema, APIs, projections, UI, or reporting cutover.  
- Reactivating Split Payment / Multi Check Allocation operator UI.  
- Replacing Order Sales (P-10) with Settlement Record.  
- Introducing Invoice / ERP / AR-AP / second Revenue formula.

---

## 3. Decision

**The Financial Settlement Platform SHALL produce a Settlement Record as an immutable Canonical Financial Document, atomically created by the Check Aggregate at financial finalization, for publication and consumption — never for monetary decision-making.**

### Constitutional rules

1. **Check remains the sole monetary Aggregate Root** (ADR-ARCH-020).  
2. **Settlement Record is not an Aggregate Root.** It is not a behavioral Aggregate. It is an **immutable Financial Document** produced by Check.  
3. **Settlement Record NEVER owns monetary decisions**, settlement workflows, or business rules.  
4. **Settlement Record NEVER calculates money** (SR-INV-01). All money is **copied** from the finalized Check snapshot (and related finalized children as specified).  
5. **Settlement Record is append-only** for money (SR-INV-02). Corrections use **compensating records**, never UPDATE of money fields.  
6. **Settlement Record MUST NOT become a second monetary SSOT** (SR-INV-03). Check remains **Financial Authority**; Settlement Record is **Financial Publication**.  
7. **Creation is atomic with Check financial finalization** (SR-INV-04) — same financial transaction; not before; not after commit.  
8. **Exactly one Settlement Record per finalized financial settlement generation** (SR-INV-05); idempotent retries MUST NOT duplicate.  
9. **Historical truth is forever** (SR-INV-06); Business Settings MUST NEVER rewrite Settlement Records.  
10. **Business Ownership unchanged:** Table/Waiter → Session; QR/Self/Kiosk → Order.  
11. **Session settle façades MAY remain** operational entry points; authoritative finalize remains Check-identified (ADR-020 R8 preserved).  
12. **Reporting migration** is dual-run → parity → cutover → rollback-capable (see §11). No breaking change to certified formulas without Acceptance Criteria.

---

## 4. Constitutional principles (mandatory)

### Principle 1 — Check is the only monetary Aggregate Root

Settlement Record MUST NOT become a second Aggregate Root.  
Settlement Record MUST NEVER own monetary decisions.

### Principle 2 — Business Ownership ≠ Financial Production

| Concept | Owner |
|---------|-------|
| Table | Session |
| Waiter | Session |
| QR Ordering | Order |
| Self Ordering | Order |
| Kiosk | Order |
| **Financial Production / Authority** | **Check Aggregate** |

### Principle 3 — Settlement Record is not a behavioral Aggregate

Settlement Record is **produced atomically by the Check Aggregate** as an **immutable Financial Document**.

Forbidden terminology for Settlement Record:

- Aggregate Root  
- Monetary Aggregate  
- Settlement Aggregate  

Required terminology:

- Immutable Financial Document  
- Canonical Financial Document  
- Published Financial Fact  
- Financial Publication  

### Principle 4 — Publication, not calculation

Settlement Record becomes the **canonical published financial document**.  
It represents a finalized financial fact.  
It does **not** perform business logic, execute calculations, or own settlement workflows.

---

## 5. Mandatory invariants

| ID | Invariant |
|----|-----------|
| **SR-INV-01** | Settlement Record MUST NEVER calculate money (subtotal, discounts, tax, grand total, FX, service charges). Values are **copied** from the finalized Check snapshot. |
| **SR-INV-02** | Settlement Record MUST be append-only for money. No UPDATE of money fields. Corrections = compensating records (Refund / Void / Reversal / Correction). |
| **SR-INV-03** | Settlement Record MUST NOT become a second monetary SSOT. Check remains Financial Authority. |
| **SR-INV-04** | Settlement Record MUST be created in the **same financial transaction** as Check financial finalization. Not before. Not after commit. |
| **SR-INV-05** | Exactly one Settlement Record for one finalized financial settlement generation. Idempotent retries MUST NOT create duplicates. |
| **SR-INV-06** | Settlement Record MUST preserve historical truth forever. Business Settings changes MUST NEVER alter historical Settlement Records. |

Additional derived rules:

| ID | Rule |
|----|------|
| **SR-INV-07** | Tenant isolation: every Settlement Record MUST carry `restaurantId`; cross-tenant correlation forbidden. |
| **SR-INV-08** | Settlement Record MUST embed or freeze tax policy snapshot + currency snapshot at creation (copied from Check freeze). |
| **SR-INV-09** | Payment Completion (Split Payment) NEVER alone creates a Settlement Record. Only Check financial finalization does. |
| **SR-INV-10** | Allocation Completion (MCA) NEVER creates or implies a Settlement Record. |

---

## 6. Critical challenges resolved

| # | Challenge | Risk if ignored | Constitutional correction |
|---|-----------|-----------------|---------------------------|
| R1 | Settlement Record as Aggregate Root | Dual monetary authority | Immutable Document produced by Check |
| R2 | Settlement Record calculates tax/totals | Drift vs Check; settings rewrite history | Copy-only (SR-INV-01 / 06) |
| R3 | Create Record after Check commit | Partial publish; race; dual TX hole | Atomic with finalize (SR-INV-04) |
| R4 | Session owns Settlement Record | Fake Sessions for kiosk; wrong ownership | Session = optional correlation only |
| R5 | Order owns Settlement Record | Violates I-FIN-12 / North Star | Order refs only via Membership / OS |
| R6 | Revenue = tender sum via Record | Breaks ADR-020 Revenue law | Revenue remains paid Check `grandTotal`; Record publishes that freeze |
| R7 | Silent UPDATE for refunds | History corruption | Compensating records only |
| R8 | Duplicate Records on retry | Inflated Reporting | Business uniqueness + already_applied |
| R9 | Cutover Reporting without dual-run | KPI discontinuity | Dual-run + parity gates |
| R10 | Confuse with Order Settlement / ST / SP / MCA | Vocabulary collapse | Glossary (§14) mandatory |

---

## 7. Aggregate & capability boundaries

| Concept | Kind | Owner | Role relative to Settlement Record |
|---------|------|-------|-------------------------------------|
| **Session** | Operational Aggregate | Dining Session | Business Owner of table/waiter visit; optional `sessionId` correlation; settle façade only |
| **Order** | Operational Aggregate | Order Domain | Business Owner of channel orders; never owns Settlement Record |
| **Check** | **Monetary Aggregate Root** | FSP / Check Domain | **Financial Producer + Financial Authority**; creates Settlement Record |
| **Settlement Record** | **Immutable Financial Document** | Produced by Check | **Financial Publication** / Canonical published fact |
| **SettlementTransaction** | Check child entity | Check | Tender ledger; Record snapshots or references tenders |
| **Order Settlement** | Check-owned entity | Check | Per-Order settlement state; Record may reference enrolled Orders / OS ids |
| **Split Payment** | Check capability | Check | Payment facts; UI dormant; never alone creates Record |
| **Multi Check Allocation** | Check capability | Check | Responsibility redistribution; UI dormant; never alone creates Record |
| **Reporting** | Read consumer | Reporting Platform | Eventually consumes Settlement Record for publication cutover; zero business-rule ownership |

Canonical production graph:

```
Session? ──façade──► Check.finalizeFinancialSettlement
                         │
                         ├── freeze Check money / tax / currency
                         ├── write SettlementTransaction[]
                         ├── update Order Settlement(s)
                         └── create Settlement Record  (same TX)
                                  │
                                  ▼
                         Financial Publication (read / report / export)
```

---

## 8. Lifecycle

| Phase | Behavior |
|-------|----------|
| **Creation** | Inside Check financial finalization TX when outcome becomes a finalized financial settlement (`paid`, `complimentary`, and void/refund generations as specified by successor programs). |
| **Publication** | After commit, Settlement Record is readable. Optional domain fact `SettlementRecordCreated` collected for ADR-021 claims; v1 MAY remain pull-only for Reporting. |
| **Consumption** | Reporting, Dashboard, Excel/PDF, analytics, future integrations read Settlement Record (after cutover) or dual-read during migration. |
| **Archival** | Soft archival metadata allowed; money fields remain immutable and queryable for history. |
| **Correction** | Never UPDATE money. Emit compensating Settlement Record(s) of kind Refund / Void / Reversal / Correction linked to original `settlementRecordId`. |

---

## 9. Canonical data model (constitutional)

Field groups (implementation types deferred to Domain/Persistence programs):

### 9.1 Identity & tenancy

| Field | Purpose | Immutability |
|-------|---------|--------------|
| `settlementRecordId` | Opaque stable identity | Immutable |
| `restaurantId` | Tenant isolation | Immutable |
| `recordKind` | `settlement` \| `refund` \| `void` \| `reversal` \| `correction` | Immutable |
| `schemaVersion` | Document shape version | Immutable per row |
| `recordGeneration` | Monotonic generation for Check settle/correction chain | Immutable |

### 9.2 Correlation

| Field | Purpose |
|-------|---------|
| `checkId` | Parent Check (required) |
| `sessionId` | Optional Session correlation |
| `financialReference` | Business idempotency / correlation key |
| `priorSettlementRecordId` | Link for compensating records (nullable) |
| `orderRefs[]` | Enrolled Order identities at finalize |
| `orderSettlementRefs[]` | Optional OS identities |

### 9.3 Financial snapshot (copied — never calculated)

| Field | Source |
|-------|--------|
| `subtotal` | Check freeze |
| `taxAmount` | Check freeze |
| `grandTotal` | Check freeze |
| `outcome` | Check outcome at finalize |
| `currencySnapshot` | Check currency freeze |
| `taxPolicySnapshot` | Check tax policy freeze |
| `businessDay` / business timestamp | Check / restaurant business-day rules at finalize |
| `settledAt` | Check settle timestamp |

### 9.4 Payment snapshot

| Field | Purpose |
|-------|---------|
| `paymentSnapshot[]` | Copied tender facts (method, amount, status, timestamps) from SettlementTransaction at finalize — or stable references + embedded display snapshot |

### 9.5 Audit metadata

| Field | Purpose |
|-------|---------|
| `createdAt` | Document creation time |
| `createdByActorType` / `createdByActorId` | Actor metadata if available |
| `producer` | Constant e.g. `check_aggregate` |
| `apiContract` / future projection metadata | Independent of money |

**Versioning:** `schemaVersion` versions document shape; `recordGeneration` versions settlement chain; neither is an invitation to mutate money.

---

## 10. Event model

### 10.1 Required (v1)

| Event | Publisher | Meaning |
|-------|-----------|---------|
| `SettlementRecordCreated` | Check Aggregate (collected fact) | Record produced in finalize TX |

### 10.2 Future compensating events

| Event | When |
|-------|------|
| `SettlementRecordRefunded` | Compensating refund record created |
| `SettlementRecordVoided` | Compensating void record created |
| `SettlementRecordCorrected` | Compensating correction record created |

### 10.3 Governance

| Concern | Rule |
|---------|------|
| **Publisher** | Check Aggregate only |
| **Consumers** | Projection claims, optional Reporting adapters, future integrations |
| **Ordering** | Record creation ordered with Check finalize commit |
| **Idempotency** | ADR-021 business-fact key = `restaurantId` + `checkId` + `recordKind` + `recordGeneration` (or equivalent) |
| **Replay** | Rebuilding readers from Settlement Record persistence MUST be deterministic |
| **Retry** | Duplicate finalize → `already_applied`; no second Record for same generation |
| **Bus** | v1 MAY collect without outbox; outbox optional in later ADR-aligned program |

---

## 11. Reporting architecture (migration)

### 11.1 Target

Settlement Record becomes the **canonical published document** for settlement-oriented Reporting consumers (Revenue publication path, settlement history, exports that describe a finalized settlement).

**Unchanged dual-metric law:**

- **Revenue** remains defined as paid Check `grandTotal` (Financial Authority). Settlement Record **publishes** that freeze.  
- **Order Sales** remains Order Read P-10.  
- **Payment mix** MAY continue to read SettlementTransaction **or** Payment Snapshot embedded in Settlement Record after parity proves equivalence.

### 11.2 Phases

| Phase | Name | Behavior |
|-------|------|----------|
| **A** | Introduce | Persist Settlement Record in Check finalize TX; Reporting unchanged |
| **B** | Dual Run | Reporting computes from Check/ST **and** Settlement Record in shadow mode |
| **C** | Parity | Automated parity gates (totals, tax, currency, tender sums, counts) |
| **D** | Cutover | Settlement-oriented Reporting reads Settlement Record; Check remains authority |
| **E** | Platform adoption | Dashboard / Excel / PDF / integrations adopt published APIs |

### 11.3 Rollback

If parity fails or KPIs diverge: revert Reporting read path to Check/ST immediately. Settlement Record persistence MAY continue (no delete of history).

### 11.4 Acceptance criteria (cutover)

1. Revenue totals match prior Check-based reports within defined tolerance (expected: exact).  
2. Tax and currency snapshots match Check freeze.  
3. No dependence on live Business Settings for historical rows.  
4. Idempotent settle produces one Record.  
5. Compensating records do not silently rewrite originals.

---

## 12. API architecture (design only — not implemented)

| Surface | Purpose |
|---------|---------|
| `settlementRecord.getById` | Read one document |
| `settlementRecord.getByCheck` | Read by Check |
| `settlementRecord.listByRestaurant` | Tenant list / history |
| `settlementRecord.listBySession` | Optional visit history |
| Internal Check service | Produce Record inside finalize (not a public “create” API for clients) |
| Projection / Read API | Optional denormalized list views |
| Reporting adapters | Read Settlement Record post-cutover |

**Forbidden:** Public APIs that calculate money or finalize settlement by writing Settlement Record alone.

---

## 13. Persistence strategy

**Decision: Settlement Record is an immutable write-model Financial Document (append-only), produced in the Check write transaction — not a Projection-only artifact.**

| Option | Verdict |
|--------|---------|
| Projection-only | **Rejected** for v1 authority of publication — projections can lag; SR-INV-04 requires same TX as finalize |
| Mutable write entity | **Rejected** — violates immutability |
| **Immutable document table (append-only)** | **Accepted** |
| Projection on top | **Allowed later** for query optimization; never source of money truth |

Justification: atomic creation with Check finalize + forever history requires durable write persistence co-committed with Check, not rebuild-from-events as the sole store.

---

## 14. Official glossary

| Term | Definition |
|------|------------|
| **Business Owner** | Aggregate responsible for operational ownership (Session for table/waiter; Order for channel ordering). |
| **Financial Producer** | Check Aggregate — the only producer of Settlement Records. |
| **Financial Authority** | Check Aggregate — sole monetary Aggregate Root and Revenue authority. |
| **Settlement Record** | Immutable Canonical Financial Document published at Check financial finalization. |
| **Settlement Transaction** | Check child tender line; payment-mix fact. |
| **Order Settlement** | Check-owned per-Order settlement state entity (ADR-022). |
| **Split Payment** | Check-owned Payment capability (ADR-024); not Aggregate Root. |
| **Multi Check Allocation** | Check-owned allocation capability (ADR-025); not Aggregate Root. |
| **Financial Publication** | Act of making finalized financial facts available for read/report/integration via Settlement Record. |
| **Canonical Financial Document** | Synonym for Settlement Record as the published settlement document. |
| **Published Financial Fact** | An immutable Settlement Record (or compensating record) after successful commit. |

---

## 15. ADR decision answers (mandatory)

1. **Why Settlement Record exists** — To publish one durable Canonical Financial Document for Reporting and integrations without consumers stitching Check + ST + Session events.  
2. **Why not an Aggregate Root** — Monetary decisions and Revenue remain on Check; Record is publication, not authority.  
3. **Why Check remains monetary authority** — ADR-020; forbids second Revenue root; Record copies Check freeze.  
4. **Why Session/Order ownership unchanged** — Business Ownership is orthogonal to Financial Production (Principle 2).  
5. **Why Record never calculates money** — Prevents drift and settings rewrite of history (SR-INV-01 / 06).  
6. **Why immutable** — Historical financial truth for multi-tenant SaaS (SR-INV-02 / 06).  
7. **Why compensating records** — Corrections without silent UPDATE; auditability.  
8. **How idempotency is guaranteed** — Unique business generation per Check finalize + ADR-021 outcomes (`already_applied`).  
9. **How Reporting migrates safely** — Dual-run → parity → cutover → rollback.  
10. **Why historical truth forever** — Embedded snapshots; no live settings recompute (SR-INV-06 / 08).

---

## 16. Successor program sequence (authorized after this ADR)

1. `SETTLEMENT-RECORD-DOMAIN-1` — pure document contracts, invariants, identities (no persistence).  
2. `SETTLEMENT-RECORD-PERSISTENCE-1` — append-only storage + migration.  
3. `SETTLEMENT-RECORD-INTEGRATION-1` — atomic create inside Check finalize.  
4. `SETTLEMENT-RECORD-PROJECTION-1` / `API-1` — optional read models + APIs.  
5. `SETTLEMENT-RECORD-REPORTING-ADOPTION-1` — dual-run / parity / cutover.

No implementation is authorized by this ADR alone.

---

## 17. Final decision

### Evidence for readiness

- Ownership boundaries are constitutionally fixed and consistent with ADR-020…025.  
- Invariants SR-INV-01…10 close the monetary dual-SSOT and immutability failure modes.  
- Persistence strategy (immutable write document + atomic Check TX) satisfies SR-INV-04.  
- Reporting migration path is dual-run gated with rollback.  
- Business Ownership of Session/Order is explicitly preserved.  
- Investigation phase concluded READY FOR ARCHITECTURE DECISION; this ADR answers the open questions required for implementation sequencing.

### Evidence against blocking

- Remaining work is program sequencing and implementation detail, not unresolved constitutional ownership.

---

# READY FOR IMPLEMENTATION

Implementation MAY begin only via the successor programs listed in §16, under Architecture Authority sequencing, without violating SR-INV-01…10 or ADR-ARCH-020.
