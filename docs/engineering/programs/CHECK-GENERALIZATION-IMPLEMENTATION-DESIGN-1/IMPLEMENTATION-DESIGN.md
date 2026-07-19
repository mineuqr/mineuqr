# CHECK-GENERALIZATION-IMPLEMENTATION-DESIGN-1 — Implementation Design

**Status:** Design Complete — Not Implemented  
**Date:** 2026-07-19  
**Governs:** ADR-ARCH-020 Financial Settlement Platform Architecture  
**Forbidden in this program:** Production code, migrations, schema changes, API implementation, UI implementation  

**Predecessor programs:** CHECK-MANAGEMENT-ARCHITECTURE-1 · CHECK-SETTLEMENT-METHODS-1 · SALES-SETTLEMENT-PLATFORM-ARCHITECTURE-1 · CHECK-GENERALIZATION-ARCHITECTURE-1 · ADR-ARCH-020  

---

## 0. Design authority

This document is the **implementation design** that future build programs must follow. It does not authorize production changes by itself. Each build phase requires its own chartered implementation program citing ADR-ARCH-020 and this design.

### Validation summary (design proof)

| Requirement | How this design satisfies it |
|-------------|------------------------------|
| Zero Dual SSOT | Single monetary root = Check; membership sole subtotal discovery after cutover |
| Zero financial ownership in Order | Order never stores outcome/tenders/tax snapshots as authority |
| Zero financial ownership in Session | Session only holds `activeCheckId` + façades |
| Backward compatibility | Session settle façades + dual-write membership from Session Orders |
| Incremental migration | Phased dual-write → backfill → cutover → sessionless channels |
| Production-safe rollout | Feature flags, tenant canaries, rollback of cutover flag |
| SaaS scalability | Tenant-scoped membership; Check-centric settle; no Session fan-out required |
| DDD | Check aggregate owns membership; cross-aggregate refs by id |
| Clean Architecture | Application services orchestrate; domain invariants in Check platform |
| Future channel extensibility | Entry point = presentation; settle always on Check |

---

## 1. Order ↔ Check Membership model

### 1.1 Ownership

| Rule | Design |
|------|--------|
| Aggregate | Membership is **inside Check** (not a separate aggregate root) |
| Authority | Check is the only authority for “which Orders compose this bill” |
| Order side | Order **MUST NOT** own settlement; optional denormalized `checkId` for query convenience is allowed **only if** Check membership remains authoritative (read-through validation on settle/recalc) |

### 1.2 Logical membership record

Each membership association (logical; persistence deferred to a schema program):

| Field | Purpose |
|-------|---------|
| `restaurantId` | Tenant isolation (mandatory) |
| `checkId` | Parent Check |
| `orderId` | Enrolled Order |
| `enrolledAt` | Audit |
| `enrolledReason` | `session_attach` \| `order_place` \| `backfill` \| `manual` (ops) |
| `active` | Soft-remove if Order cancelled before settle (or treat cancel as zero contribution without deleting) |

**Uniqueness:** `(restaurantId, orderId)` among memberships whose Check `outcome ≠ voided` — enforces I-FIN-06 (at most one non-void Check per Order).

### 1.3 Contribution rule

```
contributingOrders(check) =
  membership.orderIds
    where order.restaurantId = check.restaurantId
    and order.status ≠ cancelled
```

```
ordersSubtotal = Σ order.totalAmount for contributingOrders
```

Then existing `computeCheckMoney(ordersSubtotal, billDiscount, frozen snapshots)`.

### 1.4 Enrollment commands (Check application service)

| Command | Behavior |
|---------|----------|
| `EnrollOrderInCheck` | Validate tenant, Check `open`, Order exists, no other non-void membership; add membership; recalculate |
| `UnenrollOrderFromCheck` | Only while Check `open`; recalculate (rare; prefer cancel → zero contribution) |
| `EnsureCheckForSession` | Compat: create/open Check, set `activeCheckId`, enroll all current Session Orders |
| `EnsureCheckForOrder` | Sessionless: create open Check (sessionId null) or attach to existing open Check for that Order; enroll |

### 1.5 Forbidden

- Discovering subtotal via `Orders WHERE sessionId = ?` **after cutover**  
- BI fields as membership keys  
- Cross-tenant / cross-Session (v1) enrollment  

---

## 2. Check lifecycle

Preserve CHECK-MANAGEMENT freeze-v1; generalize triggers.

```
                    create (with snapshots)
                           │
                           ▼
                        ┌──────┐
          enroll/       │ open │◄──── recalculate (membership change,
          unenroll/     │      │      bill discount, cancel)
          cancel order  └──┬───┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
      ┌──────┐        ┌──────────────┐   ┌────────┐
      │ paid │        │ complimentary│   │ voided │
      └──┬───┘        └──────┬───────┘   └────┬───┘
         │                   │                │
         └──────── totalsFrozenAt ────────────┘
              (+ tenders per CHECK-SETTLEMENT-METHODS-1)
```

| Transition | Who may invoke | Side effects |
|------------|----------------|--------------|
| → open | Session create / EnsureCheckForOrder / ensure | Snapshots frozen |
| open → open (recalc) | Enrollment, cancel, bill discount | Totals update; snapshots unchanged |
| open → paid | Settle paid (+ tenders) | Freeze; write SettlementTransactions; close Session if linked |
| open → complimentary | Settle comp | Freeze; complimentary tender; close Session if linked |
| open → voided | Close without pay / abandon | Freeze; no tenders; Session close if linked |

**Refunded (future):** SettlementTransaction status only; does not invent ERP credit aggregates (ADR-ARCH-020).

---

## 3. Session optionality

| Field | Design |
|-------|--------|
| `Check.sessionId` | **Nullable** — set for table visits; null for kiosk/counter/delivery |
| `SettlementTransaction.sessionId` | **Nullable** — copy from Check at write time when present |
| `Session.activeCheckId` | Remains required for table open Sessions that bill |
| Fake Sessions for finance | **Forbidden** |

### Session responsibilities (operational only)

- Create/open visit  
- Point `activeCheckId` at Check  
- Call Check façades (`markPaid` → settle by checkId)  
- Close visit after settle/void  

### Session must never

- Compute subtotal authority  
- Own tender lines  
- Define Revenue  

---

## 4. Settlement orchestration

### 4.1 Authoritative path (all channels)

```
Resolve checkId
  → ensure Check open (or reject)
  → validate membership / totals
  → settleCheckPaid | settleCheckComplimentary | voidCheck
  → (if sessionId present) transition Session closed
```

### 4.2 Entry-point façades (presentation / channel)

| Façade | Resolves checkId via | Preserves UX |
|--------|----------------------|--------------|
| `session.markPaid` / `markComplimentary` / close-void | `session.activeCheckId` | Dining / Waiter / Table |
| `check.settlePaid` (new, design-only) | Explicit `checkId` | Sessionless channels |
| `order.settlePaid` (new façade, design-only) | Resolve Check from membership by `orderId` | Self-order / kiosk |

**Critical:** `order.settlePaid` is an **application façade**, not Order-domain ownership. Internally it only loads membership → Check and delegates to Check settle. Order aggregate remains settlement-free.

### 4.3 Tender orchestration

Unchanged from CHECK-SETTLEMENT-METHODS-1:

- Paid: 1..N captured tenders sum to `grandTotal`  
- Complimentary: one complimentary tender  
- Void: no tenders  
- Default paid without UI: single `other` line  

---

## 5. Channel adoption strategy

**Principle:** Entry point is presentation. Financial ownership is always Check.

### 5.1 Dining — Waiter / Tables (and current table-bound QR visits)

| Concern | Design |
|---------|--------|
| UX entry | **Dining Session** (unchanged) |
| Resolve Check | `session.activeCheckId` (ensure open Check on Session create) |
| Settle | Session façade → Check |
| Order UI | **MUST NOT** expose settlement controls |
| Enrollment | On Session create: open Check; on OrderCreated with `sessionId`: enroll into Session’s active Check + recalc |

**Note on QR:** Production table QR today creates a Dining Session. To **preserve existing UX**, table QR remains on the **Dining entry path**. Non-table / kiosk self-order uses §5.2.

### 5.2 Self Ordering (Kiosk / counter self-order)

| Concern | Design |
|---------|--------|
| UX entry | **Order** (order detail / checkout settle surface — channel UI) |
| Resolve Check | Membership by `orderId` → Check; if none, `EnsureCheckForOrder` then enroll |
| Settle | Order façade → Check settle |
| Session | None (ephemeral); `Check.sessionId = null` |
| Timing | **Check created at place** (recommended default) so open bill exists before staff/kiosk settle; alternative “create at first settle” allowed only if product requires — default is place-time ensure |

### 5.3 QR Ordering

| Mode | Entry | Rationale |
|------|-------|-----------|
| **Table QR (current production)** | Dining Session (§5.1) | Preserve existing Session settle UX |
| **Non-table QR / future QR self-pay** | Order (§5.2) | Same as Self Ordering |

Product must not call table QR “Self Ordering settle” while still using Session — classification follows **whether a Dining Session exists**.

### 5.4 Future channels (delivery, marketplace, …)

| Rule | Design |
|------|--------|
| Entry point | Defined per channel presentation program |
| Finance | Always Check + membership + SettlementTransaction |
| Forbidden | Second monetary model, fake Sessions, settle-in-Order domain |

---

## 6. Migration sequencing

| Phase | Name | Goal | Dual SSOT? |
|-------|------|------|------------|
| **M0** | Design ratification | This document + ADR-ARCH-020 cited by build charter | N/A |
| **M1** | Membership persistence + dual-write | Write membership on Session Order attach; still read subtotal via Session scan | Yes (temporary) |
| **M2** | Backfill membership | Historical Session Orders → membership | Yes |
| **M3** | Read cutover | Subtotal **only** from membership; kill Session scan authority | No |
| **M4** | Nullable sessionId + Check-centric settle API | Enable sessionless Checks | No |
| **M5** | Session façades verified | `markPaid` delegates by `activeCheckId` only | No |
| **M6** | Kiosk/counter adoption | EnsureCheckForOrder + Order settle façade + UI entry | No |
| **M7** | Cleanup | Remove dual-write flags; architecture guards | No |

**Hard gate:** M3 must not start until M2 validation proves membership parity with Session scan for canary tenants.

---

## 7. Backfill strategy

### 7.1 Scope

For each restaurant / Check with `sessionId` set:

1. Load Orders where `orders.sessionId = check.sessionId` (and `restaurantId` match).  
2. Insert membership rows for each Order not already enrolled.  
3. Do **not** rewrite Check money in place unless parity check fails (then recalc open Checks only).

### 7.2 Parity validation (canary)

For sample Checks:

```
sessionScanSubtotal ≡ membershipSubtotal
```

(for non-cancelled Orders). Terminal Checks: compare stored `subtotal` to recomputed membership subtotal within freeze expectations.

### 7.3 Idempotency

Re-run safe: uniqueness on `(restaurantId, orderId)` non-void membership.

### 7.4 Sessionless historical Orders (kiosk)

No Check today → **no backfill into Revenue** (correct: never collected via Check). Future places create Checks going forward only. Do not invent paid Checks for past kiosk Orders.

---

## 8. Compatibility strategy

| Surface | Strategy |
|---------|----------|
| `session.markPaid` | Keep signature; resolve `activeCheckId`; call Check settle |
| Session create → Check | Keep; additionally enroll existing/future Session Orders into membership |
| OrderSessionConsumer | Keep event trigger; change body to Enroll + Recalc (not Session-scan-only) |
| Dashboard Session UI | Unchanged entry |
| Reporting APIs | Unchanged contracts/formulas |
| Soft-sunset `ops.getSettlement*` | Remains sunset; not revived |

---

## 9. Rollback strategy

| Stage | Rollback |
|-------|----------|
| M1 dual-write | Disable membership writes; Session scan still authoritative |
| M2 backfill | Membership rows deletable by runId; no Check formula change |
| M3 cutover flag | Flip read path back to Session scan **only if** dual-write still running; never roll back cutover without dual-write |
| M4 nullable sessionId | Stop creating sessionless Checks; table path unaffected |
| M6 kiosk | Feature-flag off Order settle entry; Orders remain fulfilment-only |

**Production rule:** Cutover flag (membership-authoritative read) requires dual-write ON. Rolling back cutover with dual-write OFF is **forbidden** (Revenue drift).

---

## 10. Event ownership

| Event / fact | Publisher | Consumers |
|--------------|-----------|-----------|
| `OrderCreated` / `OrderCancelled` / status changes | Order Domain | Check enrollment/recalc (Financial Settlement); Order Read; Session aggregates (ops) |
| `CheckOpened` | Check platform | Ops/analytics (optional) |
| `CheckRecalculated` | Check platform | Optional projections |
| `CheckSettledPaid` / `CheckSettledComplimentary` / `CheckVoided` | Check platform | Session close façade; Reporting invalidation/poll; receipts (future) |
| Settlement tender captured | Check platform (with settle) | Payment analytics read path |

**Rules**

- Order events **never** carry settlement outcome as Order state.  
- Check events are financial facts; Reporting must not become write authority.  
- Enrollment handlers are idempotent (ADR-ARCH-014 spirit).

---

## 11. Read model impacts

| Read model | Impact |
|------------|--------|
| Order Read (P-02/P-03/P-10/P-06) | **No formula change.** Optional projection of `checkId` for UX later — not SSOT |
| Session overview / active tables | Still Session ops; money display resolves via `activeCheckId` → Check |
| Check reporting repository | Unchanged Revenue query shape; more rows when sessionless Checks appear |
| Payment analytics | Unchanged; sessionId on tenders nullable |
| Client caches | Poll/refetch after settle (existing 10s patterns acceptable) |

**Forbidden:** New “financial” read model that re-aggregates Order totals as Revenue.

---

## 12. Reporting compatibility

| KPI / surface | Change? |
|---------------|---------|
| Check Revenue / Tax / Avg Check / Paid Checks | **No formula change** |
| Payment Method Analytics | **No formula change** |
| Order Sales / Completed Orders / Average Order | **No change** |
| Executive / Excel / PDF contracts | **No change** |
| Business Day bounds | Sessionless Checks use Check `settledAt` / create timestamps with existing BD utilities |
| Historical table Revenue | Preserved |

Coverage expansion (kiosk paid Checks appear in Revenue) is **intended**, not a regression.

---

## 13. API evolution strategy

### 13.1 Keep (compat)

- `session.markPaid` / `markComplimentary` / `closeSession`  
- Existing Check-internal services used by Session  

### 13.2 Add (design — future programs)

| API (conceptual) | Actor | Purpose |
|------------------|-------|---------|
| `check.get` / `check.getByOrder` | Staff / channel | Resolve bill |
| `check.settlePaid` | Staff / channel | Authoritative settle |
| `check.settleComplimentary` | Staff | Comp |
| `check.ensureForOrder` | Platform | Sessionless open Check |

### 13.3 Must not

- `order.markPaid` as Order-domain mutation of payment fields  
- Parallel `salesSettlement.*` revenue API  
- Breaking removal of Session settle before M5 proven  

---

## 14. Transaction boundaries

| Operation | Single transaction should include |
|-----------|----------------------------------|
| Enroll + recalc (open Check) | Membership insert + Check totals update |
| Session create + open Check | Session row + Check row + `activeCheckId` (+ empty membership ok) |
| Order place (session path) | Order commit **then** outbox; enrollment in async consumer **or** sync post-commit enroll in same request after Order commit — prefer **event/outbox** for Order purity (ADR-ARCH-004/010) with idempotent enroll |
| Settle paid | Final recalc + outcome + tenders + totalsFrozenAt; then Session close (same TX preferred for table) |
| EnsureCheckForOrder + enroll | Check create + membership + recalc |

**Consistency choice (recommended):**

- Order write path stays Order-owned.  
- Enrollment is **reliable eventual** via outbox consumer with idempotency, **or** sync ACL after Order commit in the place use-case — both acceptable if enrollment lag cannot allow settle before enroll (settle must ensure enrollment first).

**Settle precondition:** `EnsureEnrolled(orderId)` before sessionless settle.

---

## 15. Aggregate consistency

| Aggregate | Consistency boundary |
|-----------|----------------------|
| Order | Order + lines only |
| Check | Check money fields + membership set + SettlementTransactions on settle |
| Session | Session status + `activeCheckId` (not money) |

**Invariants enforced at Check boundary**

- Open-only enroll  
- Tenant match  
- One non-void membership per Order  
- Paid tender sum = grandTotal  
- No recalc after freeze  

**Concurrency:** Open Check recalculation and settle must use optimistic versioning or equivalent (apply ADR-ARCH-011 spirit to Check) to prevent lost updates under concurrent enroll/settle.

---

## 16. Production rollout plan

| Step | Action |
|------|--------|
| 1 | Ship M1 dual-write behind flag `check.membership.dualWrite=true` (dark) |
| 2 | Canary tenants: run M2 backfill; parity report |
| 3 | Enable dual-write globally |
| 4 | Canary M3 cutover `check.membership.authoritativeRead=true` |
| 5 | Fleet M3 after parity SLO |
| 6 | Ship M4 Check settle API (no UI yet) |
| 7 | Validate Session façades on canary |
| 8 | M6 kiosk flag `check.sessionless.kiosk=true` per restaurant |
| 9 | Expand sessionless channels by charter |
| 10 | M7 remove Session-scan code path; guards on |

**Observability**

- Metrics: enroll latency, parity mismatch count, settle-by-check vs settle-by-session  
- Ops events for backfill runs (pattern from BD rollup backfill)  

**SLO for cutover**

- Parity mismatch rate = 0 on canary for N business days  
- No Revenue formula changes in KPI guards  

---

## 17. Channel UX matrix (mandatory preservation)

| Channel | Settlement starts from | Resolves Check via | Order UI shows settle? |
|---------|------------------------|--------------------|------------------------|
| Waiter / Tables | **Dining Session** | `activeCheckId` | **No** |
| Table QR (current) | **Dining Session** | `activeCheckId` | **No** |
| Self Ordering Kiosk | **Order** | Membership / ensure | Channel settle surface only (façade) |
| Future delivery | Channel-defined entry | Always → Check | Never Order-domain finance |

---

## 18. Follow-on implementation programs (charter hints only)

Not authorized by this design alone:

1. `CHECK-MEMBERSHIP- Persistence-1` — schema + dual-write  
2. `CHECK-MEMBERSHIP-BACKFILL-1` — backfill + parity  
3. `CHECK-MEMBERSHIP-CUTOVER-1` — authoritative read  
4. `CHECK-SESSIONLESS-API-1` — nullable sessionId + check settle API  
5. `CHECK-KIOSK-ADOPTION-1` — Order entry settle UX  

Each must cite **ADR-ARCH-020** + this design and pass architecture guards for Zero Dual SSOT.

---

## 19. Final design statement

ADR-ARCH-020 is realized by: **Check-owned Order membership**, **optional Session**, **Check-centric settle with Session and Order façades**, **phased dual-write → backfill → cutover**, and **channel entry points that never move financial ownership out of Check**.

**Design status: COMPLETE.** Ready to charter Phase M1 implementation under separate program approval.
