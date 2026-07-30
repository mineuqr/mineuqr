# COMMERCIAL PLAN BOUNDARIES

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Date** | 2026-07-30 |

---

## Boundary matrix

| Domain | Owns | Must not own | Consumes |
|--------|------|--------------|----------|
| **Commercial Catalog** | Plan Identity, Plan Versions, prices, cycles, feature bundles, limit profiles, trial **templates**, promotions defs, migration/retirement policies, CC-14/15/16, Snapshot **schema** | Subscription instances, entitlement evaluation, Snapshot **persistence**, payments, invoices, Order/Check money | Auth/Admin for mutation |
| **Plan** *(artifact)* | Identity + Versions under Catalog | Runtime entitlement | — |
| **Subscription** | Instances, status SM, period, Snapshot persist/bind/activate, entitlement evaluation, Grandfathered mode | Catalog composition, publish authority, Billing ledger | Published Versions; Snapshot schema |
| **Entitlement** | Evaluation result (allow/deny/limit) derived from Snapshot | Catalog Draft; feature implementation | Activated Snapshot |
| **Billing (future)** | Payment intents, invoices, tax calculation, renewal success/failure **signals** | Catalog Versions, Snapshot schema, entitlement formulas | Snapshot/Subscription period & price facts; Catalog tax-policy **refs** only |
| **Reporting** | KPI presentation of commercial/subscription facts | Mutating Catalog or Subscription commercial truth | Immutable Snapshot + Subscription period facts |
| **AI** | Future assistant UX | Catalog editing; inventing entitlements | Entitlement APIs only |
| **Order** | Order aggregate & fulfilment | Plan states; entitlements SSOT | Entitlement gates before place/advance as required |
| **Restaurant / Menu** | Menu catalog | Commercial plan lifecycle | Entitlement for feature flags (e.g. hotelMode) |
| **Tenant Identity** | Org/Tenant/Restaurant graph | Plans, prices, Snapshots | — |
| **RBAC** | Roles/permissions | Commercial publish content | Gates Catalog/Subscription commands |
| **Check / Settlement / CRMP** | Money & custody | SaaS plan lifecycle | — |

---

## Ambiguity killers

| Confusion | Resolution |
|-----------|------------|
| “Plan is Active” | **Illegal phrasing.** Say **Version Published** or **Subscription Active** |
| “Deprecate suspends tenants” | **False.** Deprecate is Catalog; Suspend is Subscription |
| “Entitlement reads live price” | **False.** Entitlement reads Snapshot |
| “Grandfathered Plan Version” | **False.** Grandfathered is Subscription mode |
| “Billing owns plans” | **False.** Billing consumes facts; Catalog owns offerings |
| “AI checks Catalog Draft features” | **False.** AI uses entitlements only |
| “Reporting uses Draft Version” | **False.** Reporting uses immutable subscription/snapshot facts |
| “Order stores plan version state” | **False.** Order may store commercial refs for audit but not own lifecycle |

---

## Runtime dependency law

```
Mutable Catalog Draft ──✗──► Entitlement / AI / Reporting / Order gates

Published Plan Version ──capture──► Snapshot ──bind──► Subscription
                                              │
                                              └──► Entitlement SSOT
```

Unbound legacy bridge (if present) is a **documented temporary** path — not a second Catalog SSOT for new architecture.

---

## Interface contracts (architecture)

| From → To | Contract |
|-----------|----------|
| Catalog → Subscription | Immutable Version id + composition for Snapshot capture |
| Subscription → Domains | Entitlement decision (feature/limit) |
| Billing → Subscription | Signals: paid, failed, renew_due (future) |
| Subscription → Reporting | Period status + Snapshot commercial facts |
| Catalog → Storefront | Published Version presentation |
| Domains → Catalog | **None** for writes |
