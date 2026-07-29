# Architecture Overview — Commercial Catalog Platform

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Date:** 2026-07-29

---

## 1. Purpose

The **Commercial Catalog Platform** answers:

> What commercial offerings exist, at which immutable versions, with what pricing, cycles, feature bundles, limits, trials, promotions, and migration/retirement policies?

It does **not** answer who subscribed, whether they are entitled right now, who may act, or how money is captured.

---

## 2. Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Commercial Catalog Platform (SSOT)               │
│  Plan Identity · Plan Version · Pricing · Cycles              │
│  Feature Bundles · Limit Profiles · Trials · Promotions       │
│  Migration Policies · Retirement Policies · Presentation      │
└────────────┬──────────────────┬──────────────────┬──────────┘
             │ consume          │ consume          │ consume
    ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼──────────┐
    │ Subscription    │ │ Billing        │ │ Portal / Admin   │
    │ (instances +    │ │ (providers OOS │ │ (presentation)   │
    │  entitlement)   │ │  — signals)    │ │                  │
    └────────┬────────┘ └────────────────┘ └──────────────────┘
             │
    ┌────────▼────────┐
    │ Reporting       │  ← commercial snapshots (historical)
    └─────────────────┘
```

---

## 3. Architectural model (normative)

```
Plan Identity          (stable product: Starter, Business, …)
    └── Plan Version   (immutable published commercial contract)
            ├── Pricing (version-scoped)
            ├── Billing Cycle definitions (referenced)
            ├── Feature Bundle (refs to Feature Catalog)
            ├── Limit Profile (refs to Limit Catalog)
            └── Trial / renewal policy refs
                    │
                    ▼
            Subscription binds to Plan Version
```

**Forbidden model:** Subscription invents or owns Plan semantics.

---

## 4. Architectural goals

| Goal | How |
|------|-----|
| Unlimited commercial evolution | New Plan Versions; never mutate published |
| Historical subscriptions immutable | Bind to Plan Version forever |
| Admin freedom | Draft → Publish new versions without rewriting customers |
| Future billing providers | Consume pricing/cycle contracts; no catalog redesign |
| Decade-scale SaaS | Versioning + SSOT + reproducible history |

---

## 5. Design laws (summary)

**CC-01…CC-12** — see [GOVERNANCE-LAWS.md](./GOVERNANCE-LAWS.md).

Headline: Plan Identity immutable · Published versions immutable · Subscriptions reference versions · **Commercial Snapshot immutable (CC-13)** · **Compatibility governed (CC-14)** · **Regional policies Catalog-owned (CC-15)** · **Publication validation gate (CC-16)** · Evolution = new versions · Catalog is SSOT.
