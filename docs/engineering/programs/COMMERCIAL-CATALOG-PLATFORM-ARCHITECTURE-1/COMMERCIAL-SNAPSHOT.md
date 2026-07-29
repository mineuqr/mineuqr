# Commercial Snapshot — CC-13

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Law:** CC-13 Commercial Snapshot Integrity

---

## 1. Definition

At the moment a commercial contract becomes **effective**, the Subscription **MUST** capture an **immutable Commercial Snapshot**.

```
Catalog (live offerings SSOT)
        │ publish / evolve
        ▼
Plan Version (immutable after publish)
        │ subscribe / activate / migrate-activate
        ▼
Commercial Snapshot (immutable contract copy)  ← independent of Catalog
        │
        ▼
Subscription (references planVersionId + snapshotId)
```

---

## 2. Independence

| Live Catalog | Commercial Snapshot |
|--------------|---------------------|
| May deprecate / retire Versions | Unaffected |
| May change Drafts / add Versions | Unaffected |
| SSOT for *what can be sold* | SSOT for *what this customer contracted* |

Changing the Commercial Catalog must **never** modify an existing commercial contract.

---

## 3. Minimum contents

Plan Identity · Plan Version · Commercial Name · Version Name · Currency · Billing Cycle · Pricing · Included Features · Usage Limits · Trial Policy (if any) · Promotion applied (if any) · Effective Date  

Plus recommended: region / country, tax-policy ref, distribution partner (when regional — **CC-15**).

---

## 4. Activation moments

| Event | Snapshot |
|-------|----------|
| New subscription activation | Create |
| Trial conversion to paid | Create or supersede per policy (new snapshot; old retained historically) |
| Governed migration to new Version (**CC-14**) | New snapshot for new contract; prior snapshot retained |
| Renewal without version change | Typically retain snapshot; price/promotion deltas recorded on charge lines |

---

## 5. Ownership

| Concern | Owner |
|---------|-------|
| Snapshot schema / required fields | Commercial Catalog (contract) |
| Snapshot persistence on Subscription | Subscription Platform |
| Entitlement/reporting historical read | Prefer Snapshot over live Catalog |

---

## 6. Law

**Commercial Snapshot is immutable after activation.**
