# Domain Ownership

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Commercial Catalog Platform owns

| Domain | Notes |
|--------|-------|
| **Plan Identity** | Stable commercial product id |
| **Plan Versions** | Immutable published commercial contracts |
| **Commercial Metadata** | Ranking, visibility, regions, tags |
| **Pricing Catalog** | Version-scoped prices & currencies |
| **Billing Cycle Definitions** | Monthly, quarterly, yearly, custom intervals |
| **Feature Bundles** | Sets of Feature Key references on a Version |
| **Limit Profiles** | Sets of limit bindings on a Version |
| **Trial Policies** | Catalog-level trial templates |
| **Promotion Definitions** | Coupons, campaigns — independent of versions |
| **Retirement Policies** | When versions stop accepting new subs |
| **Migration Policies** | How customers move between versions |
| **Version Compatibility Matrix** | Upgrade/downgrade targets, migration requirements, breaking changes (**CC-14**) |
| **Regional Commercial Policies** | Country/region/currency/tax-policy ref/partner/regulatory (**CC-15**) |
| **Publication Validation Rules** | Draft→Published gate (**CC-16**) |
| **Commercial Snapshot Contract** | Required snapshot schema at activation (**CC-13**) — Catalog defines; Subscription persists |
| **Commercial Presentation Metadata** | Display names, marketing copy keys |

**No other platform may own these concepts.**

---

## 2. Does not own

| Concern | Owner |
|---------|-------|
| Subscription instances / entitlement evaluation / **Commercial Snapshot persistence** | Subscription Platform |
| Payment capture / invoices / tax **calculation** | Billing (out of scope) — consumes Catalog tax-policy refs |
| Tenant / Org identity | Tenant Identity |
| Permissions / roles | RBAC |
| Feature **runtime behavior** | Business Domains |
| Feature **availability check** | Subscription entitlement (consumes Catalog) |

---

## 3. Consumer matrix

| Consumer | Mode |
|----------|------|
| Subscription Platform | **Consume** Plan Version + bundles/limits/trial policy |
| Billing providers | **Consume** pricing + cycle (signal/charge); never own catalog |
| Entitlement evaluator | **Consume** feature/limit refs from bound Plan Version |
| Admin / Portal UI | **Present** catalog; mutations via Catalog APIs (future) |
| Reporting | **Consume snapshots** of version commercial facts |

---

## 4. Ownership laws

| Rule ID | Statement |
|---------|-----------|
| **OWN-CC-01** | Catalog is the sole writer of Plan Identity and Plan Versions. |
| **OWN-CC-02** | Subscription may only reference published (or historically bound) Plan Versions. |
| **OWN-CC-03** | Billing must not invent SKUs outside Catalog. |
| **OWN-CC-04** | Domains must not embed plan/version commercial matrices (**SP-19** alignment). |
| **OWN-CC-05** | Promotions attach commercially without mutating published versions (**CC-08**). |
