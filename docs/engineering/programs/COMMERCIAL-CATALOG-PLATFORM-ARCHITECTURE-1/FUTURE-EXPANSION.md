# Future Expansion Strategy

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Extensibility without redesign

| Capability | Mechanism |
|------------|-----------|
| New plans / versions | Additive Plan Identity + Versions |
| Regional / multi-currency pricing | Price dimensions on Versions |
| Usage-based | Cycle + meter keys; Billing consumes |
| Add-ons | Plan Identity family or Version-stackable add-on Versions |
| Marketplace modules | Feature Keys + Version bundles / partner promotions |
| Enterprise contracts | Custom Plan Identity + negotiated Versions |
| White-label | Presentation metadata + partner promotions |
| New billing provider | Consume Catalog prices/cycles — swap adapter |

---

## 2. Recommended sequence

```
COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  ← this
        ↓
ADR-ARCH-037
        ↓
COMMERCIAL-CATALOG-FOUNDATION-1
  • Plan Identity / Version / Price Draft-Publish
  • Feature/Limit catalogs (align Subscription SP-17)
        ↓
SUBSCRIPTION bind to planVersionId (adoption)
        ↓
Migration / Promotion Foundations
        ↓
Billing provider boundary program (OOS here)
```

---

## 3. Decade scalability demonstration

| Concern | Architecture answer |
|---------|---------------------|
| Continuous packaging changes | Immutable Versions |
| Never break installed base | Bind + explicit migration |
| Global commerce | Currency/region price dimensions |
| Audit / finance | Reproducible snapshots (**CC-11**) |
| Provider churn | Catalog SSOT; Billing is adapter |

---

## 4. Success metrics (future)

| Metric | Target |
|--------|--------|
| Published Version mutations | 0 |
| Subscriptions without planVersionId + Snapshot | 0 (**CC-03**, **CC-13**) |
| Migrations outside compatibility allow-list | 0 (**CC-14**) |
| Regional SKUs owned by Billing | 0 (**CC-15**) |
| Published Versions missing CC-16 mandatory fields | 0 |
| Billing SKUs outside Catalog | 0 |
| Implicit migrations on publish | 0 |
| Deleted Retired Version history / Snapshots | 0 |
