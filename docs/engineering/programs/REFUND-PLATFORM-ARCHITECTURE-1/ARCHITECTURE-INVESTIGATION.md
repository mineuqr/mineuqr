# REFUND PLATFORM ARCHITECTURE-1 — Architecture Investigation Report

| Field | Value |
|---|---|
| **Program** | REFUND PLATFORM ARCHITECTURE-1 |
| **Phase** | Architecture Investigation |
| **Mode** | **STRICT READ-ONLY** |
| **Date** | 2026-07-26 |
| **Authority** | Architecture Constitution v1.0 · ADR-ARCH-020 · 021 · 022 · 023 · 026 · 028 · 030 · 031 |
| **Code / schema / API changes** | **NONE** |
| **Verdict** | **READY FOR ADR** |

---

# 1. Executive Summary

MineuQR already constitutionalizes Refund as a **first-class Financial Settlement Platform (FSP) capability under the Check Aggregate**. Evidence is primary in **ADR-ARCH-023** (Refund ownership), **ADR-ARCH-026** (immutable Settlement Record + compensating `refund` documents), and **ADR-ARCH-022** (`refunded` as terminal Order Settlement state — never reopen to `pending`).

**Recommended architecture (sole):**

> **Refund Platform = FSP capability owned by Check Aggregate.**  
> Application mutates Check / Order Settlement / tender facts under Check authority.  
> Publication appends an immutable compensating **Settlement Record** (`recordKind=refund`) linked via `priorSettlementRecordId`.  
> Register / Financial Shift may attribute custody of the refund document — they never own Refund money.  
> Order and Session remain business owners of channels/visits — never Refund owners.

This preserves a **single monetary SSOT (Check)**, **immutable financial publication (Settlement Record)**, **tenant isolation**, and **no reopen of terminal lifecycles**.

Partial domain stubs already exist (e.g. `createCompensatingSettlementRecord`, `refundOrderSettlement`, `refundPayment`, `refundOrderSettlementsOnCheck` reserved comment) — confirming the architecture direction without authorizing a production Refund product surface.

---

# 2. Architecture Investigation Report

## 2.1 Certified financial baseline (evidence)

| Concern | Owner today | Evidence |
|---------|-------------|----------|
| Monetary Aggregate Root / Revenue | **Check** | ADR-ARCH-020 I-FIN-01…05; Constitution North Star |
| Tender / payment mix | SettlementTransaction under Check | CHECK-SETTLEMENT-METHODS-1; ADR-026 §2.1 |
| Per-Order settlement state | Order Settlement (Check-owned Entity) | ADR-ARCH-022 |
| Canonical published financial document | Settlement Record (immutable) | ADR-ARCH-026 SR-INV-01…10 |
| Till / custody | Register + Financial Shift + Attribution | ADR-ARCH-028 / 030 |
| Reporting Revenue | Paid Check / paid Settlement Record publication path | ADR-020 / 026 |
| Order Sales | Order Read | Dual-metric law |
| Event idempotency | Transport + business claims | ADR-ARCH-021 / 014 |

Canonical production graph:

```
Order / Session (business ownership)
        │
        ▼
Check (sole monetary Aggregate Root)
  ├── Membership
  ├── SettlementTransaction[]
  ├── Order Settlement[]
  ├── (Phase C) Payment / Refund capabilities
  └── Settlement Record publish (same TX on finalize)
            │
            ▼
Settlement Attribution → Register + Financial Shift (custody only)
            │
            ▼
Reporting / Analytics / Exports (read consumers)
```

## 2.2 Gap that REFUND-PLATFORM-ARCHITECTURE-1 must close

ADR-023 names **REFUND-PLATFORM-ARCHITECTURE-1** as the successor domain architecture program for Refund. ADR-026 already specifies compensating record kinds including `refund`. ADR-022 already defines Order Settlement transition `settled|complimentary → refunded` as terminal.

**Missing (architecture ADR scope — not implementation):** unified Refund command model, refundable limits algebra, tender/refund allocation rules, Check outcome interaction after refund, Attribution of refund Settlement Records, Reporting treatment of refund generations, idempotency business keys for refund apply.

---

# 3. Mandatory Decision Questions

## Q1 — What architectural component should own Refund?

**Answer: Financial Settlement Platform / Check Aggregate (Refund Platform capability).**

**Evidence:**

- ADR-ARCH-023 §3 rule 5: *“Refund is a first-class FSP capability under Check authority — never owned by Order Aggregate.”*  
- ADR-ARCH-023 §3 rule 1: Check remains sole financial mutation root for *“Refund application”*.  
- FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1/ARCHITECTURE.md §3.5: Owner = **Refund Platform under FSP / Check Aggregate**.  
- ADR-ARCH-026 R7: Silent UPDATE for refunds forbidden → compensating Settlement Records produced under Check finalize/publication model.

---

## Q2 — Should Refund belong to Order / Session / Check / Settlement / SR / Register / New Aggregate?

| Candidate | Verdict | Why |
|-----------|---------|-----|
| Order | **Forbidden** | ADR-023 R2; I-FIN-12; Constitution Order-centric ≠ Order owns money |
| Session | **Forbidden** | Session ≠ Finance (ADR-020); optional context only |
| **Check / FSP** | **Owner** | ADR-023; sole monetary mutation root |
| “Settlement” as vague domain | **Ambiguous — reject as owner label** | Settlement workflows are Check-owned; use FSP/Check |
| Settlement Record | **Publication only** | ADR-026: not Aggregate Root; never decides money |
| Register / Financial Shift | **Forbidden as money owner** | ADR-028/030: custody + Attribution only |
| New monetary Aggregate | **Forbidden** | ADR-020 R5 / Zero Dual SSOT |
| Existing Aggregate (Check) | **Yes — capability inside Check boundary** | ADR-023 |

---

## Q3 — Is Refund Aggregate / Entity / Document / Event / Compensating Record / Platform?

**Answer (layered — all evidenced):**

| Classification | Verdict |
|----------------|---------|
| New Aggregate Root | **No** |
| Standalone Entity outside Check | **No** (would fork money) |
| **FSP Capability / Platform capability under Check** | **Yes** (ADR-023 §3.5; named Refund Platform) |
| Domain Event alone | **No** — events record facts; Check applies Refund |
| **Compensating Settlement Record (`recordKind=refund`)** | **Yes — publication form** (ADR-026 §8–9) |
| Immutable Financial Document (the SR row) | **Yes for publication**; the Refund *operation* is Check-applied |

**Working definition for ADR drafting:**  
Refund is an **approved financial capability** of the Check Aggregate that applies reverse value within refundable limits and **publishes** an append-only compensating Settlement Record; Order Settlement may transition to terminal `refunded`.

---

## Q4 — Does introducing Refund violate ADR-021, ADR-022, or the Constitution?

### ADR-ARCH-021 (Event Idempotency)

**No violation if** Refund apply uses:

- Transport ledger for event consumers (ADR-014/021 Pattern A), and  
- Business-fact idempotency for refund application (ADR-026 §10.3 already sketches keys: `restaurantId + checkId + recordKind + recordGeneration`).

Refund as accumulating financial effect **requires** Pattern B/D/E business claims — governance already exists; not a contradiction.

### ADR-ARCH-022 (Order Settlement)

**No violation if** Refund follows I-OS-14:

- `settled|complimentary → refunded` is **allowed** (terminal→terminal).  
- `refunded → pending|partially_settled` is **forbidden**.  
- Refund is **not** “reopen unpaid.”

Evidence: ADR-022 §6.2–6.3.

### Architecture Constitution

**Compatible** when Refund stays inside FSP/Check bounded context, preserves Order as Core Domain for operations (not money), preserves single Revenue law, tenant isolation, and ADR hierarchy. Violations would arise only from forbidden alternatives (Order-owned Refund, SR mutation, Register-owned money).

---

## Q5 — Can Refund be introduced without a second Financial Source of Truth?

**Yes — proven by constitution.**

| Layer | Role after Refund |
|-------|-------------------|
| Check | **Sole monetary authority** — applies Refund mutation |
| Settlement Record (original) | Immutable publication of prior finalize |
| Settlement Record (`refund`) | Compensating publication — **not** a second authority |
| Reporting | Reads published facts; Revenue law remains paid Check / SR publication rules — refund generations adjust nets per Reporting ADR/program, not a new root |

ADR-026 SR-INV-03: Settlement Record MUST NOT become second monetary SSOT. Compensating records preserve that law.

---

## Q6 — Does Refund require reopening any completed lifecycle?

| Lifecycle | Reopen required? | Proof |
|-----------|------------------|-------|
| Order (operational served/cancelled) | **No** | Kitchen/ops lifecycle orthogonal; LIFECYCLE-SETTLEMENT-GUARDS concern settle-before-complete, not refund reopen |
| Session (closed) | **No** | Closed Session remains closed; refund is Check financial path; Session may correlate optionally |
| Check (`paid` → reopen `open`) | **No** | Reopening Check would violate freeze / terminal finance; ADR-023/022 prefer reverse facts |
| Settlement Record | **No** | SR-INV-02 append-only |
| Order Settlement | **No reopen to pending** | Transitions to terminal `refunded` (I-OS-14) |

---

## Q7 — Where is the Financial Finalization Point? Can Refund occur before / modify it?

**Financial Finalization Point (evidence ADR-026 SR-INV-04):**

> Check financial finalization TX that freezes Check money and **atomically creates** the Settlement Record.

| Question | Answer |
|----------|--------|
| Can Refund occur before finalization? | **No** — nothing settled/collected to reverse; unpaid Cancel/Void path already exists (`void` / staff cancel) |
| Can Refund modify the finalization Settlement Record? | **No** — SR-INV-02; use compensating `refund` record with `priorSettlementRecordId` |

---

## Q8 — Should Settlement Record remain immutable? How should Refund relate?

**Yes — immutable (ADR-026, ADR-031 Permanent class).**

Relationship:

```
Settlement Record (kind=settlement, generation=N)
        ▲
        │ priorSettlementRecordId
        │
Settlement Record (kind=refund, generation=N+k)   ← append-only compensating document
        ▲
        │ produced by Check Refund application (same financial TX as Check/OS updates)
```

Domain already encodes this: `createCompensatingSettlementRecord` + invariant requiring `priorSettlementRecordId` for `refund|reversal|correction`.

---

# 4. Architecture Decision Inputs (for successor ADR)

1. Owner = Check Aggregate / FSP Refund capability (ADR-023).  
2. Publication = compensating Settlement Record `recordKind=refund` (ADR-026).  
3. Order Settlement path = terminal `refunded` (ADR-022 I-OS-14).  
4. No second monetary Aggregate; no SR UPDATE; no Order/Session/Register ownership of Refund money.  
5. Idempotency = ADR-021 business claim on refund generation.  
6. Attribution = reference refund SR to Register/Shift (ADR-028/030 fail-open pattern).  
7. Revenue / Analytics treatment = Reporting adoption program after ADR (dual-run if nets change).  
8. Partial domain stubs are hints, not product authorization.

---

# 5. Financial Ownership Matrix

| Concern | Owner | Forbidden owners |
|---------|-------|------------------|
| Bill / grandTotal / Check outcome authority | Check | Order, Session, SR, Register |
| Tender ledger | SettlementTransaction under Check | Order, Register |
| Per-Order settlement state | Order Settlement under Check | Order Aggregate |
| **Refund apply / refundable limits** | **Check / Refund Platform** | Order, Session, Register, Reporting |
| **Refund publication document** | **Settlement Record (compensating)** produced by Check | Register rewrite, UI rewrite |
| Custody / till accountability | Register + Financial Shift + Attribution | Check money fields |
| Order fulfilment lifecycle | Order | Check |
| Visit lifecycle | Session | Check |
| Reporting KPIs | Reporting reads | Writers inventing nets |

---

# 6. Financial Lifecycle Trace

```
Place Order → (optional) enroll Check → Kitchen…
        │
        ▼
Check finalize (paid|complimentary)
  + SettlementTransaction[]
  + Order Settlement → settled|complimentary
  + Settlement Record (settlement, gen=1)     ← FINALIZATION POINT
        │
        ▼
Settlement Attribution → Register + open/closed Shift (fail-open)
        │
        ▼
[Future] Refund apply (Check)
  + OS → refunded (terminal)
  + tender/refund allocations (Check)
  + Settlement Record (refund, gen=2, prior=SR1)  ← NEVER mutates SR1
        │
        ▼
Attribution of refund SR (custody) → Reporting consumers
```

Void-before-pay remains a separate path (`recordKind=void` / Check void) — not Refund.

---

# 7. Settlement Platform Assessment

| Topic | Assessment |
|-------|------------|
| FSP readiness for Refund ownership | **Ready** — ADR-023 already assigns Refund to Check |
| Split Payment `refundPayment` | Domain stub under Check capability — must not become parallel Refund SSOT |
| Order Settlement `refundOrderSettlement` | Aligns with ADR-022 `refunded` |
| CheckService `refundOrderSettlementsOnCheck` | Explicitly **reserves Check outcome mutation** for future workflow — confirms gap is Check-level Refund orchestration, not Order ownership |
| Risk | Multiple partial “refund” verbs without one Refund Platform ADR → vocabulary collapse |

---

# 8. Settlement Record Assessment

| Invariant | Implication for Refund |
|-----------|------------------------|
| SR-INV-01 Copy-only money | Refund SR copies Check reverse snapshot — never recalculates tax policy from live settings |
| SR-INV-02 Append-only | Refund = new row, never UPDATE |
| SR-INV-03 Not second SSOT | Check decides; SR publishes |
| SR-INV-04 Atomic with finalize | Refund finalize TX must publish refund SR atomically with Check/OS updates |
| SR-INV-05 One record per generation | Refund generations monotonic; idempotent retries |
| SR-INV-07 Tenant isolation | `restaurantId` on every refund SR |
| ADR-031 Permanent | Refund SRs not purgeable by ordinary retention |

---

# 9. Alternative Architecture Analysis

## Alternative A — Refund belongs to Check (FSP capability)

| Aspect | Evaluation |
|--------|------------|
| Advantages | Matches ADR-023/020; single mutation root; aligns OS + SR compensating model |
| Disadvantages | Requires careful refundable-limit algebra and Check outcome rules |
| Risks | Incomplete Check outcome design if rushed |
| Scalability | Supports partial refunds, multi-tender reverse, multi-channel |
| Ops complexity | Medium — cashier refund UX + Shift attribution |
| Compatibility | **Highest** |
| ADR compatibility | **Required by ADR-023** |
| **Verdict** | **RECOMMENDED** |

## Alternative B — Refund belongs to Settlement Record

| Aspect | Evaluation |
|--------|------------|
| Advantages | Document-centric mental model |
| Disadvantages | SR is not Aggregate Root; cannot decide money (ADR-026) |
| Risks | Second SSOT; UPDATE temptation |
| ADR compatibility | **Violates SR-INV-01/03** |
| **Verdict** | **REJECTED** — SR is publication of Refund, not owner |

## Alternative C — Refund belongs to Register

| Aspect | Evaluation |
|--------|------------|
| Advantages | Cash drawer UX proximity |
| Disadvantages | Register must not own money (ADR-028 CR-INV / OL-INV) |
| Risks | Till variance ≠ guest financial truth |
| **Verdict** | **REJECTED** — Attribution only |

## Alternative D — Refund is a separate Financial Compensation Platform (new Aggregate Root)

| Aspect | Evaluation |
|--------|------------|
| Advantages | Clean bounded context packaging |
| Disadvantages | Second monetary root; ERP creep (ADR-020 R5) |
| Risks | Dual Revenue / dual settle |
| **Verdict** | **REJECTED** as Aggregate Root; **acceptable only as named capability package under FSP/Check** (synonym of Alt A) |

## Alternative E — Refund owned by Order Aggregate

| Aspect | Evaluation |
|--------|------------|
| Advantages | Channel UX simplicity |
| Disadvantages | Violates I-FIN-12 / ADR-023 R2 |
| **Verdict** | **REJECTED** |

## Alternative F — Mutate original Settlement Record in place

| Aspect | Evaluation |
|--------|------------|
| Advantages | Simpler tables |
| Disadvantages | Destroys history; violates SR-INV-02; ADR-026 R7 |
| **Verdict** | **REJECTED** |

---

# 10. Business Invariants (current) & Refund threat analysis

| Invariant | Source | Threatened by Refund? | Mitigation |
|-----------|--------|----------------------|------------|
| Check sole monetary root | ADR-020 | Yes if Alt E/D | Keep Alt A |
| Revenue = paid Check grandTotal (not tender sum) | ADR-020 R9 | Yes if Reporting sums tenders naïvely | Reporting adoption for refund generations |
| SR immutable money | ADR-026 | Yes if UPDATE | Compensating records only |
| OS terminal immutability (I-OS-14) | ADR-022 | Yes if reopen pending | `refunded` terminal |
| Tenant isolation | ADR-020/026 | Yes if cross-tenant prior SR | `restaurantId` + assert |
| Idempotent finalize | ADR-021/026 | Yes if duplicate refund gens | Business claim keys |
| Attribution fail-open | ADR-030 | Low | Same fail-open for refund SR |
| Register never owns money | ADR-028 | Yes if Alt C | Custody only |
| Settlement Records Permanent | ADR-031 | Low if purge attempted | Never purge SR |
| Lifecycle: no terminal ops before settle | LIFECYCLE-SETTLEMENT-GUARDS-1 | Orthogonal | Refund after settle only |

---

# 11. Architectural Risk Register

| Risk ID | Description | Severity | Probability | Impact | Affected | Mitigation | New Architecture Program? |
|---------|-------------|----------|-------------|--------|----------|------------|---------------------------|
| RF-R01 | Refund implemented as Order-owned | Critical | Medium | Dual finance | Order, Check, Reporting | ADR cites ADR-023; fitness guards | NO (enforce existing) |
| RF-R02 | UPDATE Settlement Record for refund | Critical | Medium | History corruption | SR, Reporting, Tax | SR-INV-02 + compensating only | NO |
| RF-R03 | Reopen OS to pending after refund | High | Medium | I-OS-14 break | Order Settlement | Terminal `refunded` only | NO |
| RF-R04 | Register invents refund money | High | Low | Custody/Revenue fork | CRMP | Attribution references refund SR | NO |
| RF-R05 | Multiple stub refund APIs diverge | High | High | Dual workflows | CheckService, Split Payment, OS | Single Refund Platform ADR + collapse stubs | **YES — this program’s ADR** |
| RF-R06 | Reporting double-counts or ignores refunds | High | Medium | KPI discontinuity | Reporting | Dual-run adoption program after ADR | YES (Reporting adoption successor) |
| RF-R07 | Refund before Settlement Record exists | Medium | Low | Orphan reverse | Check | Gate: prior paid/comp SR required | NO |
| RF-R08 | Idempotency gaps on refund apply | High | Medium | Inflated refunds | Events, SR gens | ADR-021 business claims | NO |
| RF-R09 | Partial refund without allocation algebra | Medium | High | Outstanding drift | Check, OS | Define refundable limits in ADR | Covered by Refund ADR |
| RF-R10 | Complimentary refund semantics unclear | Medium | Medium | Policy bugs | Check, OS | ADR must specify complimentary→refunded | Covered by Refund ADR |

---

# 12. Constitution Compliance Report

| Rule | Status |
|------|--------|
| Order = Core Domain (ops) | **Compliant** if Refund not Order-owned |
| Service ownership boundaries | **Compliant** under FSP/Check |
| Single monetary SSOT | **Compliant** under Alt A |
| Aggregate boundaries | **Compliant** — Refund capability, not new root |
| Immutability of SR | **Compliant** via compensating records |
| Idempotency governance | **Compliant** if ADR-021 applied to refund gens |
| Tenant isolation | **Compliant** with restaurant-scoped identities |
| ADR-021 | **No conflict** |
| ADR-022 | **No conflict** if I-OS-14 honored |
| ADR-023 | **Directly mandates** Refund under Check |
| ADR-026 | **Directly mandates** compensating refund SR |

**Violations if wrong alternative chosen:** Alt B/C/E/F would violate Constitution + ADR-020/023/026. Alt A introduces **no constitutional violation**.

---

# 13. Gap Analysis

| Gap | Needed for ADR? | Needed for Implementation? |
|-----|------------------|----------------------------|
| Ownership of Refund | **Closed** (ADR-023) | — |
| SR compensating model | **Closed** (ADR-026) | Persistence already partial |
| OS `refunded` state | **Closed** (ADR-022) | Domain commands exist |
| Unified Refund command / limits algebra | **Open — ADR must define** | Implementation |
| Check outcome after partial/full refund | **Open — ADR must define** | Implementation |
| Interaction with Split Payment refundPayment | **Open — ADR must unify** | Implementation |
| Attribution of refund SR | **Open — refine ADR-028/030 adoption** | Implementation |
| Reporting nets for refund generations | **Open — Reporting adoption program** | After ADR |
| Operator UX surface (Orders vs Sessions) | Product/ADR non-normative channel façades | After ADR |

**Missing information that would block ADR:** None for ownership/model selection. Remaining gaps are **ADR content scope**, not missing constitutional evidence.

---

# 14. Architecture Recommendation

**Adopt Alternative A only.**

Publish a dedicated **ADR-ARCH-0xx Refund Platform** that:

1. Refines ADR-ARCH-023 §Refund and ADR-ARCH-026 compensating records.  
2. Declares Check Aggregate as sole Refund mutation authority.  
3. Declares Settlement Record `recordKind=refund` as sole publication form (append-only, `priorSettlementRecordId` required).  
4. Declares Order Settlement `refunded` as terminal (I-OS-14).  
5. Forbids Order/Session/Register ownership of Refund money.  
6. Requires ADR-021 business idempotency for refund generations.  
7. Sequences Reporting dual-run adoption as a successor — not part of ownership ADR.

No implementation, schema, or API work is authorized by this investigation.

---

# 15. READY FOR ADR ASSESSMENT

| Criterion | Met? |
|-----------|------|
| Ownership evidenced | **Yes** (ADR-023) |
| Publication model evidenced | **Yes** (ADR-026) |
| Lifecycle/reopen rules evidenced | **Yes** (ADR-022 I-OS-14) |
| Dual-SSOT rejection evidenced | **Yes** (ADR-020/026) |
| Constitution compatibility | **Yes** |
| Alternatives analyzed & rejected | **Yes** |
| Risk register | **Yes** |

**Information still missing for implementation programs (not for ADR ownership decision):** refundable-limit formulas, partial refund UX policy, complimentary refund product rules, Reporting net formulas — these belong **inside** the Refund ADR / Reporting adoption, not as blockers to starting the ADR.

---

# FINAL VERDICT

**READY FOR ADR**

Evidence: ADR-ARCH-023 already assigns Refund to the Check Aggregate / FSP; ADR-ARCH-026 already requires compensating Settlement Records for refunds; ADR-ARCH-022 already forbids reopening Order Settlement after refund. The only architecture that preserves Correctness, Tenant Isolation, Financial Integrity, Reliability, Observability, Maintainability, and Extensibility is **Refund as an FSP capability under Check with immutable compensating Settlement Record publication**.
