# Future Roadmap & Extensibility — Deliverable 13

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Extensibility without redesign

| Capability | Mechanism |
|------------|-----------|
| Monthly / Annual plans | Plan metadata + lifecycle renewal intervals |
| Usage-based pricing | Limit meters + soft/hard/grace; billing consumes signals |
| Add-ons | Catalog products stacked on base subscription |
| Marketplace modules | Feature keys + partner licensing policy |
| Partner licensing | Entitlements granted under partner contracts |
| Enterprise contracts | `plan.enterprise` / `plan.custom` + overrides |
| Promotions / Coupons | Policy layer adjusting price signals (billing) / trial — not new identity |
| Regional pricing / Multi-currency | Presentation & billing metadata; keys stable |
| White-label licensing | Plan/feature visibility + partner attachments |
| Channel partners | Reseller-attached Tenant subscriptions |

---

## 2. Recommended sequence

```
RBAC-PLATFORM-ARCHITECTURE-1
TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1
SUBSCRIPTION-PLATFORM-ARCHITECTURE-1   ← this program
        │
        ▼
ADR-ARCH-036 publication
        │
        ▼
SUBSCRIPTION-PLATFORM-FOUNDATION-1
  • Feature/Plan catalogs
  • Entitlement + limit evaluator
  • Lifecycle states
  • Dual-read with legacy commercial checks
        │
        ├─ SUBSCRIPTION-ADOPTION-1 (domain call sites)
        ├─ TRIAL-POLICY-ADOPTION-1
        ├─ AI-ENTITLEMENT-ADOPTION-1
        └─ BILLING-PROVIDER-BOUNDARY-1 (separate; OOS here)
```

---

## 3. Phase goals

### Phase A — Constitution

Accept architecture · Publish ADR-036 · Freeze SP-01…20 + **Plans Are Presentation. Features Are Contracts.**  

### Phase B — Foundation

Catalogs · `checkEntitlement` / `checkLimit` · lifecycle · attach to Canonical Tenant ID  

### Phase C — Adoption

Replace domain plan switches · dual gate with RBAC · AI limits  

### Phase D — Advanced commerce

Usage · add-ons · marketplace · partner licensing  

---

## 4. Success metrics (future)

| Metric | Target |
|--------|--------|
| Domain `if (plan === …)` commercial gates | → 0 (**SP-19**) |
| Feature key silent rename / semantic reuse | 0 (**SP-17**) |
| Long-running jobs without snapshot when required | 0 (**SP-18**) |
| Plan packaging forcing feature redesign | 0 (**SP-20**) |
| Entitlement checks bypassed by AI tools | 0 |
| Payment provider as sole entitlement truth | 0 |
| Actions allowed when not entitled or not authorized | 0 |
