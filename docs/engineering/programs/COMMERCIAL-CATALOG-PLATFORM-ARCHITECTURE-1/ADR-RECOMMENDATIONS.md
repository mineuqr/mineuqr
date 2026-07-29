# ADR Recommendations

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — ADRs **recommended**, not published by this program  
**Date:** 2026-07-29  
**Revision:** CC-13 · CC-14 · CC-15 · CC-16 — **do not publish until final Architecture Authority certification**

Suggested number after Subscription (036): **ADR-ARCH-037** (subject to Registry).

---

## 1. Recommended primary ADR

### ADR-ARCH-037 — Commercial Catalog Platform (Plan Versions & Commercial SSOT)

| Field | Proposed value |
|-------|----------------|
| **Status** | Draft → Proposed (upon Architecture Authority **final** acceptance after CC-13…16 amendments) |
| **Owner** | Architecture Authority |
| **Program** | COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1 |
| **Related** | ADR-ARCH-034 (RBAC) · ADR-ARCH-035 (Tenant Identity) · ADR-ARCH-036 (Subscription) |

#### Context

Unlimited commercial evolution requires immutable Plan Versions, version-scoped pricing, Subscriptions bound to Versions, independent Commercial Snapshots, governed compatibility, regional policies, and a publication validation gate.

#### Decision (proposed)

1. Establish **Commercial Catalog Platform** as SSOT for Plan Identity, Plan Versions, Pricing, Billing Cycles, Feature Bundles, Limit Profiles, Trial Policies, Promotions, Migration Policies, Retirement Policies, Regional Commercial Policies, and Version Compatibility.  
2. Mandate laws **CC-01…CC-16**.  
3. Normative model: Plan Identity → Plan Version → Pricing/Cycles/Bundles; Subscription binds to **Plan Version** and captures **Commercial Snapshot**.  
4. Published Versions immutable; evolution = new Versions; migration explicit and **compatibility-constrained**; retirement preserves history.  
5. Promotions never modify Versions.  
6. Subscription Platform **consumes** Catalog; persists Snapshots; retains entitlement evaluation.  
7. Future billing providers integrate by consuming Catalog contracts — no redesign.  
8. **Mandate CC-13 Commercial Snapshot Integrity.**  
9. **Mandate CC-14 Version Compatibility Governance.**  
10. **Mandate CC-15 Regional Commercial Policies.**  
11. **Mandate CC-16 Publication Validation Gate.**  

#### Mandatory amendments in ADR body

| ID | Title |
|----|-------|
| **CC-13** | Commercial Snapshot Integrity |
| **CC-14** | Version Compatibility Governance |
| **CC-15** | Regional Commercial Policies |
| **CC-16** | Publication Validation Gate |

#### Consequences

| + | − |
|---|---|
| Unlimited commercial evolution | Catalog + Subscription dual Foundations |
| Historical reproducibility via Snapshot | Snapshot schema discipline |
| Safe migrations via allow-lists | Compatibility matrix maintenance |
| Regional commerce without Billing ownership | Multi-currency catalog ops |
| No incomplete Published Versions | Stricter publish UX |

**This program does not create the ADR file or update the Registry.**  
**Do not publish ADR-ARCH-037 until final Architecture Authority certification of this revision.**

---

## 2. Publication checklist (future)

- [ ] Architecture Authority **finally certifies** this program (including CC-13…16)  
- [ ] Confirm ADR-ARCH-037 with Registry  
- [ ] Clarify Subscription ADR-036 catalog ownership → consume Catalog + persist Snapshot  
- [ ] No runtime until Commercial Catalog Foundation certified  

---

## 3. Explicit non-ADRs

- Payment gateway choice  
- Tax/invoice calculation engines  
- Entitlement evaluator implementation  
- Schema/migration design  
