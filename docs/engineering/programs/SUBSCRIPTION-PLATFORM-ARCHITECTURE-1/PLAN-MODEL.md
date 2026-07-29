# Plan Model — Deliverable 2

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** SP-20 Commercial Evolution · Plans Are Presentation / Features Are Contracts

---

## 1. What a Plan is

A **Plan** is a **replaceable commercial packaging bundle** in the Platform Plan Catalog (**SP-20**).

**Canonical law:** Plans Are Presentation. Features Are Contracts.

| Plans **are** | Plans are **NOT** |
|---------------|-------------------|
| Named commercial offerings / packaging | Business logic |
| References to Features | Permanent capability identity |
| References to Limits | Permission sets |
| References to Policies | Identity |
| Versionable / replaceable / retireable bundles | Something Domains may `switch` on (**SP-19**) |

---

## 2. Canonical plan examples

| Plan key (stable while live) | Display name (mutable presentation) | Intent |
|------------------------------|-------------------------------------|--------|
| `plan.starter` | Starter | Entry SMB |
| `plan.professional` | Professional | Growing venues |
| `plan.business` | Business | Multi-venue ops |
| `plan.enterprise` | Enterprise | Custom limits / contracts |
| `plan.custom` | Custom | Negotiated bundle |

**Law:** Plan **keys** identify packaging entries while in catalog. Plan **names** are presentation. Plans may be evolved, replaced, or retired (**SP-20**) without redesigning Feature Keys (**SP-17**).

Retired plan keys are not reused for different packaging semantics.

---

## 3. Plan composition

```
Plan
  ├── featureKeys[]          → Feature Catalog (contracts)
  ├── limitBindings[]        → Limit Model (metric → quota/policy)
  ├── policyRefs[]           → Commercial policies (trial eligibility, grace, …)
  ├── billingIntervalHints[] → monthly / annual / custom (pricing presentation; billing OOS)
  └── metadata               → visibility, ranking, regions (non-semantic to entitlement core)
```

Plans **reference** features and limits; they do not embed domain behavior. Commercial evolution rebundles features — it does not rename them (**SP-20**).

---

## 4. Plan laws

| Rule ID | Statement |
|---------|-----------|
| **PLN-01** | Plans never contain business logic. |
| **PLN-02** | Plans never grant RBAC permissions. |
| **PLN-03** | Features outlive plans — removing a plan does not delete feature keys (**SP-20**). |
| **PLN-04** | Changing a plan’s display name does not change entitlements. |
| **PLN-05** | Enterprise/Custom plans may reference the same features with different limits. |
| **PLN-06** | Add-ons are plan-like catalog products that stack onto a base subscription under policy. |
| **PLN-07** | Domains never evaluate plan keys — only feature entitlements (**SP-19**). |
| **PLN-08** | Plan versioning / regional / marketplace offerings are packaging changes only (**SP-20**). |

---

## 5. Plan migration (commercial)

Upgrade / downgrade / plan change adjusts the Tenant’s subscription **instance** to reference another plan key. Feature/limit deltas are evaluated by Entitlement + Limit models — not by domains inventing migration rules.

In-flight long-running jobs may retain an **entitlement snapshot** from start (**SP-18**) so mid-migration packaging changes do not alter already executing work.
