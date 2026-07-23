# SETTLEMENT-RECORD-PLATFORM-1 — Architectural Investigation

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-RECORD-PLATFORM-1 |
| **Phase** | Investigation (read-only) |
| **Date** | 2026-07-23 |
| **Type** | Architectural investigation — **no implementation** |
| **Priors** | ADR-ARCH-020…025 · Reporting Platform · Split Payment · Order Settlement · MCA (UI dormant) |
| **Conclusion** | **READY FOR ARCHITECTURE DECISION** |

---

## 1. Executive Summary

MineuQR already has a **certified Financial Settlement Platform** centered on the **Check Aggregate** (ADR-ARCH-020). Operational payment for table visits is driven by **Session façades** (`session.markPaid` / `markComplimentary` / `close`) that settle the Check, write tender lines (`check_settlement_transactions`), update Order Settlements, then close the Session.

There is **no entity or table named “Settlement Record”** today. The term appears only as **roadmap / UX platform naming** (post–MCA UI suspension). Financial truth for reporting is already distributed across intentional dual metrics:

| Metric | SSOT |
|--------|------|
| **Revenue / Tax** | Paid Check (`operational_checks`) |
| **Payment mix** | SettlementTransaction under Check |
| **Order Sales** | Order Read P-10 (`order_read_analytics_daily`) |

**Settlement Record Platform** must be designed as a **canonical, immutable financial settlement record** that reporting and future integrations can consume—**without** violating ownership of Table/Waiter→Session, QR/Self/Kiosk→Order, or Check as sole monetary Aggregate Root.

This investigation finds the current architecture **sufficiently understood and documented** to proceed to a formal Architecture Decision (ADR) for Settlement Record. No blocking unknowns remain that would force “NOT READY,” though several open questions should be resolved *in* that ADR.

---

## 2. Existing Architecture

### 2.1 Platform stack (certified)

```
Ownership (must not break)
  Table / Waiter     → Dining Session
  QR / Self / Kiosk  → Order

Financial Settlement Platform (ADR-020+)
  Check Aggregate (sole monetary root)
    ├── Membership (Order composition)
    ├── SettlementTransaction[] (tenders)
    ├── Order Settlement (per-Order settlement state)
    ├── Split Payment (payment capability; not Aggregate Root)
    └── Multi Check Allocation (dormant UI; core active)

Read / Presentation / Reporting
  Order Settlement Projection → orderSettlement.* API → Workspace panels
  Split Payment Projection    → splitPayment.* API → Workspace panels (read)
  MCA Projection              → multiCheckAllocation.* API → UI dormant
  Reporting Platform          → reads Check + ST + Order Read (pull, not event bus)
```

### 2.2 Current settlement flow (Record Payment)

**Authoritative operational path today:** Session Mark Paid → Check finalize → Session close.

```
UI: MarkPaidSettlementDialog / DiningSessionActionBar / SessionRowQuickActions
  → tRPC session.markPaid({ restaurantId, sessionId, settlements? })
    → sessionService.markPaid
      → settleAndCloseSession(..., "paid", settlements)

TX1 — Check-owned (withCheckOwnedTransaction)
  1. Resolve / ensure open Check for Session
  2. Recompute open Check money from Membership Orders
  3. Resolve staff settlement lines (tenders) / default paid line
  4. finalizeCheckOutcome → operational_checks outcome=paid, freeze totals/tax/currency, settledAt
  5. insertSettlementTransactions → check_settlement_transactions
  6. applyFullSettlementToCheckOrders → Domain applyFullSettlement + persist OS

Post-commit (soft, non-rollback)
  tryMaterializeOrderSettlementProjections(committed OS + collected OS events)

TX2 — Session-owned (separate db.transaction)
  7. Session status open → paid → closed
  8. insertSessionEvent SESSION_PAID then SESSION_CLOSED
     (metadata may include Check grandTotal)

UI refresh
  Mutation returns getOwnerWorkspace; client invalidates
  session workspace, orders, orderSettlement.*, splitPayment.*, ops.*

Reporting
  No write-side publication. Later queries read committed Check / ST rows.
```

**Complimentary:** same shape with `settleCheckComplimentaryByIdDetailed` + `applyComplimentary` + `SESSION_COMPLIMENTARY`.

**Close without payment:** best-effort `voidCheckByIdDetailed` + OS void + membership deactivate, then Session `closed` with null settlement outcome / `SESSION_CLOSED` (`manual_close`).

### 2.3 Parallel capabilities (not Mark Paid UI)

| Capability | Write path | Production UI |
|------------|------------|---------------|
| Order Settlement | Check Aggregate Integration | Read panel only |
| Split Payment | Check Aggregate Integration (no public write tRPC) | Read panel only; Mark Paid does not run SP materializer |
| Multi Check Allocation | Check Aggregate + API writes | **UI dormant** (PRODUCTION-ADOPTION-1 Rev 2.0) |

---

## 3. Ownership Analysis

| Concern | Current owner | Notes |
|---------|---------------|-------|
| **Settlement state (bill terminal outcome)** | **Check Aggregate** | `operational_checks.outcome` = open / paid / complimentary / void |
| **Payment completion (Payment level)** | **Split Payment** (ADR-024) | Distinct from Check settle; UI incomplete for write |
| **Financial completion (Revenue)** | **Check settle `paid`** | ADR-020: Revenue = paid Check `grandTotal` |
| **Per-Order settlement state** | **Order Settlement** under Check (ADR-022) | Not Order-owned; not Revenue |
| **Tender / payment method facts** | **SettlementTransaction** child of Check | Payment Method Analytics SSOT |
| **Visit / table lifecycle** | **Dining Session** | Façade for settle+close; not Reporting Revenue SSOT |
| **Order placement / fulfilment** | **Order** | Order Sales via Order Read; not Check Revenue |
| **Reporting publication** | **None (pull model)** | Reporting adapters read committed write model |
| **Allocation across Checks** | **MCA** under Check | Core active; operator UI dormant |

**Constitutional constraint (must preserve):**  
Check remains the **sole monetary Aggregate Root**. Settlement Record must not become a second monetary Aggregate Root that invents Revenue (ADR-020 R5/R9).

---

## 4. Domain Analysis

| Entity | Ownership | Boundary / invariants | Coupling |
|--------|-----------|----------------------|----------|
| **Check** | Aggregate Root | Open recalculates from Membership; terminal freezes money/tax/currency; tenant-scoped | Session optional façade; Membership; ST; OS; SP; MCA |
| **Membership** | Check-internal | Sole discovery of contributing Orders after cutover | Order IDs only; no BI coupling |
| **SettlementTransaction** | Check child | Tender lines; sum may ≠ Revenue; status captured | Reporting payment mix |
| **Order Settlement** | Check-owned entity | Per-Order coverage; not Aggregate Root; not Revenue | Recalc while Check open; settle/void/refund with Check |
| **Split Payment** | Check FSP capability | Payment ≠ Check settle; Outstanding Check-owned | May drive partial OS via Integration |
| **Multi Check Allocation** | Check FSP capability | Redistributes responsibility; no money invention | UI dormant |
| **Session** | Ops Aggregate | Table/waiter visit; status paid/closed | Must not own Revenue |
| **Order** | Ops Aggregate | Lines, fulfilment, `totalAmount` | Enrolled into Check for money |
| **Reporting DTOs** | Read model | Zero business-rule ownership | Dual metric discipline |

**Invariants to protect in Settlement Record design:**

1. Revenue ≠ tender sum (unless ADR explicitly revises — currently Forbidden).  
2. Historical tax/currency from Check snapshots, never live Business Settings.  
3. Payment completion ≠ Financial Settlement.  
4. Allocation completion ≠ Check Settlement.  
5. Session / Order ownership of table/waiter/ordering channels unchanged.

---

## 5. Database Analysis

Canonical schema: `drizzle/schema.ts`. Relevant migrations: `0069`–`0075`.

| Table | Purpose | Owner | Lifecycle | Authoritative / Derived |
|-------|---------|-------|-----------|-------------------------|
| `operational_checks` | Monetary bill / Check | Check | open → paid / complimentary / void; freeze on terminal | **Authoritative** Revenue/Tax |
| `check_settlement_transactions` | Tender ledger | Check | Inserted at finalize | **Authoritative** payment mix; ≠ Revenue |
| `check_order_membership` | Order↔Check composition | Check | Active while enrolled | **Authoritative** composition |
| `check_order_settlements` | Per-Order settlement state | Check | Create → settle/void/refund… | **Authoritative** OS write model |
| `check_split_payments` (+ tenders, allocations, attempts) | Split Payment WM | Check | Payment lifecycle | **Authoritative** Payment facts |
| `multi_check_allocations` (+ children, history) | Cross-Check allocation | Check | Allocation lifecycle | **Authoritative** allocation facts |
| `dining_sessions` | Visit context; `activeCheckId`; legacy settlement fields | Session | open → paid/complimentary → closed | **Operational**; **forbidden** Revenue SSOT |
| Orders (core order tables) | Placement / lines | Order | Kitchen/fulfilil lifecycle | Ops; Order Sales via projections |
| `order_read_analytics_daily` | Order Sales rollup | Order Read P-10 | Derived from Order events | **Derived** |
| `order_read_operational_kpi_daily` | Ops counters | Order Read P-06 | Derived | **Derived** |
| `restaurants.tax*` | Live tax policy | Config | Mutable | **Config only** — not historical money |
| `table_events` | Session timeline facts | Session ops | Append | Operational feed; not Revenue |

**Settlement Record does not exist as a table today.**

---

## 6. Event Analysis

### 6.1 Published (persisted, operational)

| Event | Publisher | Consumer | Notes |
|-------|-----------|----------|-------|
| `SESSION_PAID` / `SESSION_COMPLIMENTARY` | `sessionService` | Ops activity feed, timeline | After Check settle |
| `SESSION_CLOSED` | `sessionService` | Ops activity feed, timeline | Always after settle or manual close |

**No outbox / message bus** for financial domain events.

### 6.2 Collected only (in-process facts)

| Family | Types (representative) | Use |
|--------|------------------------|-----|
| Order Settlement | Created, Recalculated, PartiallySettled, Settled, Complimentary, Cancelled, Voided, Refunded | Projection event claims |
| Split Payment | Payment*, TenderAllocated, OutstandingUpdated, Attempt* | Projection event claims (materializer often unwired post–Mark Paid) |
| MCA | Allocation* | Projection event claims on MCA API writes |

### 6.3 Idempotency / ordering / races

| Mechanism | Behavior |
|-----------|----------|
| ADR-021 | Transport vs business-fact idempotency; projections rebuild from write model |
| Domain outcomes | `already_in_state` / `already_applied` / `no_change` |
| Persistence | CAS / expected status on OS; duplicate enrollment → re-read |
| Projection | Deterministic revision + event claim keys; upsert replace; soft `tryMaterialize*` |
| Race: Check before Session | Paid Check may exist briefly while Session still `open` |
| Race: Projection lag | Finance commits even if materialize fails; workspace may re-hydrate on read |
| Concurrent finalize | Non-`open` Check rejected (`CheckTransitionError`) |
| Reporting | Query-time recompute — no event-driven publication race |

---

## 7. API Analysis

### Mutations (operational settlement)

| Procedure | Layer | Dependency |
|-----------|-------|------------|
| `session.markPaid` | Session façade | Check `settleCheckPaidByIdDetailed` |
| `session.markComplimentary` | Session façade | Check complimentary settle |
| `session.close` | Session | Best-effort Check void + close |

Check Aggregate service entrypoints (non-tRPC façade):  
`settleCheckPaidById[Detailed]`, `settleCheckComplimentaryById[Detailed]`, `voidCheckById[Detailed]`, SP/MCA/OS Integration commands.

### Reads (financial presentation)

| Router | Kind | Notes |
|--------|------|-------|
| `orderSettlement.*` | Query-only | Projection SSOT for OS UI |
| `splitPayment.*` | Query-only | Projection SSOT for SP UI |
| `multiCheckAllocation.*` | Query + Mutation | UI dormant; API preserved |
| `session.getOwnerWorkspace` | Query | Hydrates workspace; may materialize OS |

### Reporting

| Procedure | SSOT |
|-----------|------|
| `reporting.getBusinessMetricsSummary` / `Trend` | Check |
| `reporting.getPaymentMethodAnalytics` | SettlementTransaction |
| `reporting.getOrderSalesSummary` / `Rollup` | Order Read P-10 |
| `reporting.getOperationalMetricsSnapshot` | Session / Order Read (non-Revenue) |
| Excel / PDF client builders | Same reporting DTOs |

**Gap:** No `settlementRecord.*` API. Consumers bind to Session actions, Check rows, ST rows, or Order Read.

---

## 8. Reporting Analysis

| Consumer | Current Source of Truth |
|----------|-------------------------|
| Dashboard Financial KPIs (Revenue, Tax, Avg Check, Paid Checks) | **Check** (`operational_checks` paid) |
| Payment Method Analytics | **SettlementTransaction** |
| Tax historical amounts | **Check** tax snapshot + `taxAmount` |
| Executive Summary (order-centric cards) | **Order Read P-10** (financial deferred to Financial Summary) |
| Order Sales | **Order Read P-10** |
| Ops overview / active tables | **Session / ops** (not Revenue) |
| Excel export | Reporting DTO bundle (Check + Order Sales + ST) |
| PDF export | Same |
| Activity feed (paid/closed) | **Session table_events** |
| Order Settlement / Split Payment panels | **Projections** (not Reporting KPIs) |
| MCA | Not in Reporting KPIs; UI dormant |

Documented matrix:  
`docs/engineering/programs/REPORTING-PLATFORM-ARCHITECTURE-1/SOURCE-OF-TRUTH.md`

---

## 9. UI Analysis

| Screen / surface | Settlement dependency | Notes |
|------------------|----------------------|-------|
| **MarkPaidSettlementDialog** | Write: tender → `session.markPaid` | Primary “Record Payment” UX |
| **DiningSessionActionBar** | markPaid / complimentary / close | Check Workspace actions |
| **SessionRowQuickActions** | Same mutations | Board shortcuts |
| **DiningSessionWorkspaceSheet** | Workspace + OS + SP panels | MCA **not mounted** |
| **OrderSettlementPanel** | `orderSettlement.*` reads | Display only |
| **SplitPaymentPanel** | `splitPayment.*` reads | Display only |
| **MultiCheckAllocationPanel** | Dormant | Preserved for reactivation |
| **ReportsTab** + SettlementOverview / Trends / PaymentMethod sections | `reporting.*` | Financial + payment mix |
| **SessionsWorkspacePanel** | Ops + business metrics | Hosts sheet |
| **Ops board / activity feed** | `ops.*` | Session paid/closed signals |
| **Exports** | Client builders from reporting DTOs | No server settlement math |
| **Dashboard** | Hosts all of the above | |

**Implication for Settlement Record:** any new canonical record must eventually feed Reporting/Dashboard/Exports without requiring staff to use Allocation/SP advanced UIs.

---

## 10. Gap Analysis

### Missing capabilities (vs target “Settlement Record as canonical financial settlement record”)

1. **No first-class Settlement Record entity** — identity, immutability, audit trail, and cross-consumer contract undefined.  
2. **No single read SSOT for “a settlement happened”** — consumers stitch Check + ST + Session events + OS projection.  
3. **Session façade coupling** — Mark Paid is Session-identified; ADR-020 already anticipates Check-identified settle for kiosk/counter without fake Sessions (R8), but production UX is still Session-first.  
4. **Split Payment write path incomplete in product** — Aggregate exists; no Mark Paid integration; SP projection not materialized on settle.  
5. **No event-driven reporting publication** — acceptable today (pull), but Settlement Record may need explicit “published” semantics for integrations.  
6. **MCA dormant** — advanced redistribution not in operator UX; Settlement Record must not assume Allocation UI.

### Architectural debt / risks

| Risk | Evidence | Impact |
|------|----------|--------|
| Dual TX Check then Session | `settleAndCloseSession` | Brief Check-paid / Session-open window |
| Projection soft-fail | `tryMaterialize*` | Stale workspace reads until hydrate |
| Multiple “settlement” vocabularies | Session status, Check outcome, OS status, ST lines, roadmap “Settlement Record” | Product/engineering confusion |
| Reporting never reads OS/SP/MCA | By design today | Advanced payment stories invisible to KPIs |
| Session legacy fields (`totalAmount`, `settlementOutcome`) | Still present historically | Temptation to misuse as Revenue |
| No Settlement Record ADR | Roadmap name only | Premature implementation risk |

### Incorrect ownership (to avoid)

- Making Settlement Record an Aggregate Root that owns Revenue.  
- Making Order or Session the Settlement Record owner.  
- Redefining Revenue as sum of SettlementTransactions without ADR revision.  
- Binding Settlement Record to MCA or Split Payment UI.

### Migration / compatibility concerns

- Existing reports must keep identical numbers during transition.  
- Historical Checks/ST must map into Settlement Record without rewrite of money.  
- Session Mark Paid must remain supported during dual-run.  
- Projection/API for OS/SP must not break when Settlement Record is introduced.

---

## 11. Risks

| # | Risk | Severity | Mitigation direction (ADR phase) |
|---|------|----------|----------------------------------|
| R1 | Second monetary SSOT | Critical | Settlement Record as **immutable fact / document** under Check authority — not competing Aggregate Root |
| R2 | Reporting rewrite instability | High | Dual-read period; Settlement Record derived from Check+ST freeze |
| R3 | Session vs Check identity for settle | High | Façade retention; Check-id settle for non-table channels |
| R4 | Vocabulary collision | Medium | ADR glossary: Settlement Record ≠ Session “settled” ≠ OS status |
| R5 | Projection lag mistaken for finance failure | Medium | Document soft materialize; Settlement Record from write TX |
| R6 | Over-scoping with MCA/SP | Medium | Phase Settlement Record for Mark Paid / Check finalize first |
| R7 | Export/PDF consumers brittle | Medium | Versioned Settlement Record DTO independent of Projection schema |

---

## 12. Recommended Architecture (proposal only — not implemented)

### 12.1 Recommended ownership

| Aspect | Recommendation |
|--------|----------------|
| **Ownership** | **Check Aggregate** creates and owns Settlement Record as an **immutable settlement fact document** at financial finalization |
| **Not** | Session Aggregate Root, Order Aggregate Root, Reporting Aggregate, or second monetary root |
| **Creation point** | Same Check-owned transaction as `finalizeCheckOutcome` + settlement transactions (atomic with Check terminal settle) |
| **Lifecycle** | Created once on terminal financial settle (`paid` / `complimentary` / possibly `void` variant); **immutable**; corrections via compensating records (refund/void) — never silent rewrite |

### 12.2 Canonical fields (draft)

Minimum identity / correlation:

- `settlementRecordId` (opaque, stable)
- `restaurantId`
- `checkId`
- `sessionId` (nullable — channel-agnostic)
- `outcome` (`paid` | `complimentary` | `void` …)
- `currencySnapshot` / `taxPolicySnapshot` (copied from Check freeze)
- `subtotal`, `taxAmount`, `grandTotal` (copied; not recalculated by consumers)
- `settledAt` / `businessTimestamp`
- `settlementTransactions[]` references or embedded tender snapshot
- `orderSettlementRefs[]` (Order IDs / OS identities enrolled)
- `financialReference` / idempotency business key
- `schemaVersion` / `recordRevision` (document versioning, not CAS merge)

### 12.3 Relationships

| Related | Relationship |
|---------|--------------|
| **Check** | Parent Aggregate; Check outcome remains Revenue SSOT until ADR says Settlement Record *is* the published form of that freeze |
| **Session** | Optional correlation for table visits; never money owner |
| **Order** | Via Membership / Order Settlement refs; Orders stay channel owners |
| **SettlementTransaction** | Child facts; Settlement Record points to or snapshots them |
| **Reporting** | Eventually reads Settlement Record for “settlement occurred” + revenue publication; Payment mix may remain ST or embed in Record |
| **Events** | Emit `SettlementRecordCreated` fact (collected then optionally published under ADR-021); no bus required in v1 |

### 12.4 Strategies

| Strategy | Recommendation |
|----------|----------------|
| **Immutability** | Append-only Record; no UPDATE of money fields |
| **Audit** | Record creation metadata + link to Check history / ST rows; optional append-only audit log |
| **Idempotency** | One Record per Check terminal settle (business key = `checkId` + outcome generation); retries return `already_applied` |
| **Event publication** | v1: create in Check TX + pull reporting; v2: optional outbox if integrations require push |
| **Projections** | Optional Settlement Record Projection for API/UI; Reporting may read persistence directly if ADR allows |

### 12.5 What Settlement Record is **not**

- Not Multi Check Allocation.  
- Not Split Payment.  
- Not Order Settlement (per-Order state).  
- Not Session status.  
- Not a replacement for Order Sales (P-10).

---

## 13. Migration Considerations

1. **Phase A — ADR:** Define Settlement Record vs Check freeze vs ST vs Session vocabulary.  
2. **Phase B — Persist:** Create Record atomically with existing Check finalize (no reporting change yet).  
3. **Phase C — Dual read:** Reporting continues on Check/ST; validate Record parity.  
4. **Phase D — Cutover:** Reporting/Dashboard/Exports/PDF switch to Settlement Record where appropriate.  
5. **Phase E — Channels:** Check-identified settle for kiosk/counter without fake Session (ADR-020 R8).  
6. **Non-goals for first cut:** MCA reactivation, full Split Payment UX, ERP ledger.

**Backward compatibility:** Session Mark Paid, existing Check/ST rows, Reporting formulas, and OS/SP read APIs must remain green throughout.

---

## 14. Open Questions (for Architecture Decision)

1. Is Settlement Record a **persistence table**, a **projection**, or both (write fact + read model)?  
2. Does Revenue SSOT **remain Check.grandTotal**, with Settlement Record as the **published freeze**, or does Reporting cut over to Record as the named SSOT while Check remains Aggregate?  
3. Are complimentary and void first-class Settlement Record outcomes in v1?  
4. Should tender lines be **embedded** in the Record or only **referenced** by ST ids?  
5. Is Session correlation mandatory for table settlements, or always optional?  
6. Do we emit a durable `SettlementRecordCreated` outbox event in v1, or stay pull-only?  
7. How do partial Split Payment flows eventually produce or amend Records without violating immutability (compensating records)?  
8. Naming in product UI: “Settlement Record Platform” vs “Financial Settlement Platform” (ADR-020) — avoid dual brand confusion.

---

## 15. Final Recommendation

### Evidence supporting readiness

- End-to-end Mark Paid path is fully traced (UI → Session → Check TX → ST → OS → projection → Session events → Reporting pull).  
- Aggregate ownership is constitutionally fixed in ADR-ARCH-020…025.  
- Reporting SSOTs are documented and implemented (Check / ST / Order Read).  
- Gaps, risks, and a coherent Settlement Record proposal are identified without requiring speculative schema discovery.  
- MCA UI suspension clarifies that Settlement Record must not depend on Allocation UX.

### Evidence against blocking

- No unresolved “unknown table” or missing settle entrypoint that would prevent ADR drafting.  
- Remaining items are **decision choices** (open questions), not investigation blockers.

---

# READY FOR ARCHITECTURE DECISION

Proceed to **SETTLEMENT-RECORD-PLATFORM-1 Architecture Decision** (ADR draft) that:

1. Defines Settlement Record ownership under the Check Aggregate.  
2. Forbids a second monetary Aggregate Root.  
3. Preserves Session/Order channel ownership.  
4. Specifies creation at Check financial finalization, immutability, idempotency, and Reporting cutover strategy.  
5. Explicitly answers the Open Questions above before any schema or API implementation.
