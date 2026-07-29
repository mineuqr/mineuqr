# Trial Architecture — Deliverable 7

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Purpose

Trials commercially enable a **defined feature/limit set** for a **bounded time** without implying Identity ownership or RBAC roles.

---

## 2. Trial ownership

| Concern | Owner |
|---------|-------|
| Trial policy (duration, eligible plans, feature set) | **Platform** |
| Trial instance / state on subscription | **Tenant** subscription |
| Activation actor | User with RBAC permission to manage subscription tools (or self-serve policy) |
| Fraud policy | **Platform** commercial governance |

---

## 3. Activation · Expiration · Conversion

```
Draft/eligible → Trial (activated)
                  │
                  ├─→ Active (conversion / upgrade / purchase signal)
                  └─→ Expired / Cancelled (no convert)
```

| Step | Rule |
|------|------|
| **Activation** | Issues trial window; entitlements = trial feature set + trial limits |
| **Expiration** | At `trialEndsAt`, transition per policy (Expired or Grace-to-convert) |
| **Upgrade path** | Self-serve or sales-assisted plan selection |
| **Conversion** | Trial → Active on successful commercial activation (billing signal OOS) |

---

## 4. Multiple trial policy

| Policy option | Architecture stance |
|---------------|---------------------|
| One trial per Tenant | Default recommended |
| One trial per Organization | Optional enterprise policy |
| Re-trial after cool-down | Explicit Platform policy only |
| Unlimited re-trials | Forbidden by default (fraud) |

**Law:** Multiple trials are never implicit — must be catalogued policy.

---

## 5. Fraud considerations (architecture requirements)

| Risk | Control direction |
|------|-------------------|
| Serial Tenant creation for trials | Identity + commercial risk signals; rate limits |
| Trial stacking via add-ons abuse | Policy forbids duplicate trial entitlements |
| Payment-avoidance loops | Cool-down; device/account risk (Auth/Identity inputs — not owned here) |
| Feature over-grant | Trial uses explicit feature set — not “all features” |

Subscription Platform evaluates eligibility; it does not implement full KYC.

---

## 6. Laws

| Rule ID | Statement |
|---------|-----------|
| **TRL-01** | Trial never creates Canonical Identity. |
| **TRL-02** | Trial never grants RBAC roles. |
| **TRL-03** | Trial entitlements flow through the same entitlement evaluator as paid. |
| **TRL-04** | Expired trial ⇒ not entitled (unless grace-to-convert policy). |
| **TRL-05** | Trial history is retained on subscription history for audit. |
