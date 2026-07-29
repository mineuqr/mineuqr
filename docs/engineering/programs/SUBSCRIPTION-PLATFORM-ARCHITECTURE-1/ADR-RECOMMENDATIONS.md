# ADR Recommendations

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — ADRs **recommended**, not published by this program  
**Date:** 2026-07-29  
**Revision:** SP-17 · SP-18 · SP-19 · SP-20 · Plans Are Presentation / Features Are Contracts — **do not publish ADR-ARCH-036 until Architecture Authority final acceptance**

Suggested number after Tenant Identity (035): **ADR-ARCH-036** (subject to Registry at publication).

---

## 1. Recommended primary ADR

### ADR-ARCH-036 — Subscription Platform Architecture (Commercial Entitlement)

| Field | Proposed value |
|-------|----------------|
| **Status** | Draft → Proposed (upon Architecture Authority **final acceptance** after this revision) |
| **Owner** | Architecture Authority |
| **Program** | SUBSCRIPTION-PLATFORM-ARCHITECTURE-1 |
| **Related** | ADR-ARCH-034 (RBAC, recommended) · ADR-ARCH-035 (Tenant Identity, recommended) |

#### Context

MineuQR requires a dedicated commercial entitlement SSOT independent of Identity, RBAC, domain logic, and payment providers. Without it, plan checks leak into domains and conflate with authorization/ownership.

#### Decision (proposed)

1. Establish **Subscription Platform** as SSOT for Plan Catalog, Feature Catalog, limits, commercial policies, subscription lifecycle, trials, and entitlement/limit evaluation.  
2. Mandate principles **SP-01…SP-20**.  
3. Core Law: Identity = WHO customer · RBAC = WHO may act · Subscription = WHAT entitled · Domains = HOW.  
4. Dual gate: `entitled ∧ authorized`.  
5. Attach subscriptions to Canonical Tenant ID; never mint/reparent Identity.  
6. Feature keys immutable commercial contracts; plans reference features; features outlive plans.  
7. AI must respect entitlements and limits; never bypass.  
8. Billing/payment remain outside this ADR’s ownership.  
9. **Mandate SP-17 — Feature Identity Stability.**  
10. **Mandate SP-18 — Entitlement Snapshot.**  
11. **Mandate SP-19 — Domain Subscription Independence.**  
12. **Mandate SP-20 — Commercial Evolution.**  
13. **Mandate canonical law: Plans Are Presentation. Features Are Contracts.**

#### Mandatory governing principles (must appear in ADR-ARCH-036)

| ID | Title | Mandatory statement (summary) |
|----|-------|-------------------------------|
| **SP-17** | Feature Identity Stability | Feature Keys are immutable commercial contracts. Never silently renamed, reused, or semantically changed. May be deprecated; deprecated keys remain valid historical contracts. New functionality requires new Feature Keys. |
| **SP-18** | Entitlement Snapshot | Long-running operations may snapshot commercial entitlement at execution start when historical correctness is required. Subscription changes after start must not alter already executing operations (exports, large reports, background/AI jobs, bulk ops). |
| **SP-19** | Domain Subscription Independence | Business Domains never evaluate Plans or subscription tiers. Domains evaluate Feature Entitlements only (`hasFeature`). Prohibited: `if (plan == …)`, `switch(subscription.plan)`, tier-specific business logic. Only Subscription Platform understands plans, bundles, pricing, commercial mapping. |
| **SP-20** | Commercial Evolution | Plans are replaceable commercial bundles. Features are permanent commercial capabilities. Plans reference Features; plans may evolve/replace/retire; Feature Keys remain stable. Commercial evolution must never require Feature redesign. |
| **LAW** | Plans Are Presentation. Features Are Contracts. | Plans = packaging. Features = permanent contracts. Packaging may change; feature identity remains stable. No Business Domain may depend on Plan identity. Only Feature Entitlements may be evaluated outside the Subscription Platform. |

#### Consequences

| + | − |
|---|---|
| Clean commercial scaling | Migration from ad-hoc plan checks |
| Compatible with RBAC + Identity | Dual-evaluation discipline on hot paths |
| Stable feature contracts (**SP-17**) | Catalog governance overhead |
| Safe async/export jobs (**SP-18**) | Snapshot policy per job class |
| Domains decoupled from packaging (**SP-19**/20) | Legacy plan switches need retirement |

**This program does not create the ADR file or update the Registry.**  
**Do not publish ADR-ARCH-036 until this revision is Architecture Authority finally accepted.**

---

## 2. Supporting ADR candidates (later)

| Topic | When |
|-------|------|
| Entitlement Decision API & adoption | Subscription Foundation |
| Entitlement Snapshot job standards | Async / reporting / AI adoption |
| Usage-based metering constitution | Usage pricing program |
| Marketplace module licensing | Marketplace architecture |
| Subscription–Billing provider boundary | Billing implementation architecture (separate) |

---

## 3. Publication checklist (future)

- [ ] Architecture Authority **finally accepts** this program (including SP-17…20 + canonical law)  
- [ ] Confirm ADR number with Registry (036 preferred)  
- [ ] Draft ADR with SP-01…20 + Core Law + **Plans Are Presentation. Features Are Contracts.**  
- [ ] Link RBAC/Identity compatibility  
- [ ] No runtime until Foundation certified  

---

## 4. Explicit non-ADRs

- Payment gateway choice  
- Invoice/tax/accounting  
- AuthN redesign  
- RBAC permission catalog  
- Identity ID codec  
- Domain feature implementations
