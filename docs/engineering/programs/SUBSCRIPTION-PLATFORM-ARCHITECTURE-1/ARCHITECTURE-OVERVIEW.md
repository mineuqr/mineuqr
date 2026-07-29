# Architecture Overview — Subscription Platform

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW  
**Date:** 2026-07-29  
**Revision:** SP-17 · SP-18 · SP-19 · SP-20 · Plans Are Presentation / Features Are Contracts

---

## 1. Purpose

The **Subscription Platform** answers:

> Given a Tenant (Canonical Identity), what **features** and **limits** is this customer commercially entitled to use right now?

It does **not** answer who the customer is, who may act, how payments settle, or how domain features behave.

---

## 2. Current state (baseline — unchanged)

| Fact | Today |
|------|-------|
| Plans / subscriptions | Exist as commercial tables (`subscription_plans`, user/restaurant-scoped subscriptions) |
| Entitlement evaluation | Partial / coupled to legacy patterns (e.g. admin commercial bypass) |
| Feature catalog as immutable SSOT | Not established as platform law |
| Clear plane separation from Identity/RBAC | Documented in prerequisites; not fully enforced in runtime |

This program does **not** change runtime. It defines the **target** commercial entitlement platform.

---

## 3. Target architecture

```
Tenant Identity (WHO / owns)
        │ attaches to Canonical Tenant ID
        ▼
┌───────────────────────────────────────────────────────┐
│              Subscription Platform                      │
│  Plan Catalog · Feature Catalog · Limits · Policies   │
│  Subscription instance · Lifecycle · Trials            │
│  Entitlement evaluation (server authoritative)         │
└───────────────┬─────────────────┬─────────────────────┘
                │ entitled?       │ limits
        ┌───────▼──────┐   ┌──────▼──────────┐
        │ RBAC         │   │ Domains / AI    │
        │ (permitted?) │   │ (how feature)   │
        └──────────────┘   └─────────────────┘
```

**Allow action (target):**

```
entitled(feature [, limit OK])  AND  authorized(permission, scope)
```

Billing/payment providers sit **outside** this platform (consume subscription state; do not own entitlement semantics).

---

## 4. Package (future — not created here)

Proposed: `shared/subscription-platform/` — catalogs, entitlement decision API, lifecycle policies.

---

## 5. Design laws (summary)

1. Subscription Independence — never Identity, never RBAC, never domain logic  
2. Commercial SSOT — Platform owns catalogs & policies  
3. Immutable Feature Keys (**SP-17**)  
4. Feature Before Plan / Commercial Evolution (**SP-20**) — plans reference features; features outlive plans  
5. Entitlement Independence — never grants permission or ownership  
6. Limit Independence — metering ≠ authz ≠ identity  
7. Presentation Independence — plan names are UX  
8. Commercial Policy Centralization  
9. Server Authoritative Entitlements  
10. Backward Compatible evolution via deprecation  
11. **Domain Subscription Independence (SP-19)** — `hasFeature` only; never `if (plan == …)`  
12. **Entitlement Snapshot (SP-18)** — long-running ops freeze entitlement at start when historical correctness is required  
13. **Canonical law:** Plans Are Presentation. Features Are Contracts.

Full set: [GOVERNANCE-PRINCIPLES.md](./GOVERNANCE-PRINCIPLES.md).
