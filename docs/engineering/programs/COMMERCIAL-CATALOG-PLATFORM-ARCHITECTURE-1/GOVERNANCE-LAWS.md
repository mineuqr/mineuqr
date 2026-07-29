# Governance Laws — CC-01…CC-16

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** CC-13 · CC-14 · CC-15 · CC-16 (Architecture Authority amendments)

These laws are the permanent **Commercial Catalog Platform Constitution**.

---

| ID | Title | Normative statement |
|----|-------|---------------------|
| **CC-01** | Plan Identity Immutable | Plan Identity never changes; id never reused for a different product. |
| **CC-02** | Published Versions Immutable | After publication, Plan Version commercial payload cannot be edited. |
| **CC-03** | Subscriptions Reference Versions | Every Subscription binds to a Plan Version — not Plan Identity alone. |
| **CC-04** | Evolution Creates Versions | Every commercial change creates a new Version (Draft→Publish). |
| **CC-05** | Pricing Version-Scoped | Prices belong to Plan Versions; published prices immutable. |
| **CC-06** | Features Globally Identified | Feature Keys are global contracts; Versions reference them. |
| **CC-07** | Limits Reusable | Limit definitions are reusable resources referenced by Versions. |
| **CC-08** | Promotions Independent | Promotions never modify Plan Versions. |
| **CC-09** | Migration Explicit | Version moves require an explicit migration policy/action. |
| **CC-10** | Retirement Preserves History | Retirement never deletes commercial history. |
| **CC-11** | Historical Reproducibility | Historical contracts (subs, invoices, reports) remain reproducible forever. |
| **CC-12** | Catalog SSOT | Commercial Catalog is the single source of truth for offerings. |
| **CC-13** | Commercial Snapshot Integrity | At commercial activation, Subscription captures an immutable Commercial Snapshot independent of Catalog. Catalog changes never alter existing contracts. |
| **CC-14** | Version Compatibility Governance | Every Published Plan Version explicitly defines upgrade/downgrade targets, migration requirements, and breaking changes — no unlimited arbitrary migration. |
| **CC-15** | Regional Commercial Policies | Catalog owns regional commercialization (country, region, currency, tax policy metadata, partner, regulatory). Not owned by Billing or Subscription. |
| **CC-16** | Publication Validation Gate | Draft→Published fails unless mandatory commercial components validate (pricing, cycle, feature bundle, limit profile, migration policy, retirement policy). |

---

## CC-13 — Commercial Snapshot Integrity (detail)

Every Subscription **MUST** capture an **immutable Commercial Snapshot** when the commercial contract becomes effective.

The snapshot exists **independently** from the live Commercial Catalog.

### Minimum contents

| Field | Notes |
|-------|-------|
| Plan Identity | Stable product id |
| Plan Version | Version id at activation |
| Commercial Name | Plan display name at activation |
| Version Name | Version label at activation |
| Currency | Contract currency |
| Billing Cycle | Cycle at activation |
| Pricing | List / contracted price facts |
| Included Features | Feature Keys (and bundle revision) at activation |
| Usage Limits | Limit bindings at activation |
| Trial Policy | If applicable (copied facts) |
| Promotion applied | If any (promotion id + effect summary) |
| Effective Date | Contract effective timestamp |

### Laws

| Rule | Statement |
|------|-----------|
| Immutable after activation | Snapshot never mutates |
| Independence | Catalog Version retirement/archive never rewrites snapshots |
| Catalog change isolation | Changing Catalog must never modify an existing commercial contract |
| Reproducibility | Historical contracts remain reconstructible from snapshot alone (**CC-11**) |

**Ownership:** Snapshot is stored with the Subscription commercial contract (Subscription Platform persists; Catalog defines required schema/contract). Catalog remains SSOT for *offerings*; Snapshot is SSOT for *that customer's bound contract*.

---

## CC-14 — Version Compatibility Governance (detail)

Commercial evolution does **not** imply universal compatibility.

Every **Published** Plan Version **MUST** explicitly define:

| Required declaration | Purpose |
|----------------------|---------|
| Supported Upgrade Targets | Allowed richer/successor Versions |
| Supported Downgrade Targets | Allowed lesser Versions |
| Migration Requirements | Prerequisites, data/limit checks, notices |
| Breaking Commercial Changes | Documented breaks vs prior Versions |

### Example

```
Business v2
  Upgrade → Business v3, Business v4
  Downgrade → Starter v5
  NOT → unlimited migration to arbitrary versions
```

Migration is a **governed business operation** constrained by these declarations (**CC-09** strengthened).

---

## CC-15 — Regional Commercial Policies (detail)

Commercial Catalog **must** support regional commercialization.

Availability and terms may vary by:

| Dimension | Examples |
|-----------|----------|
| Country / Region | SA, AE, PH, … |
| Currency | SAR, AED, PHP, … |
| Tax Policy | Metadata for Billing to apply — Catalog owns *which policy applies* |
| Distribution Partner | Channel availability |
| Regulatory Constraints | Offer eligibility |

### Example

| Offering | Region | Price |
|----------|--------|-------|
| Business | Saudi Arabia | 349 SAR |
| Business | United Arab Emirates | 349 AED |
| Business | Philippines | PHP pricing |

**Ownership:** Regional commercial policies belong to **Commercial Catalog**.  
**Not** owned by Billing.  
**Not** owned by Subscription.

Billing consumes region/currency/tax-policy *references*; Subscription binds Tenant to a Version + regional commercial context captured in the Snapshot (**CC-13**).

---

## CC-16 — Publication Validation Gate (detail)

A Plan Version **MUST NOT** transition Draft → Published unless all mandatory commercial components are valid.

### Mandatory (publication fails if missing)

| Component | ✓ |
|-----------|---|
| Pricing exists | Required |
| Billing Cycle exists | Required |
| Feature Bundle exists | Required |
| Limit Profile exists | Required |
| Migration Policy defined | Required (may be Remain-on-current + empty targets with explicit “none”) |
| Retirement Policy defined | Required |

### Optional

Trial Policy · Promotion Eligibility  

**Publication MUST fail** if mandatory commercial metadata is incomplete — preventing incomplete products in production.

---

## Historical integrity (derived)

| Artifact | Rule |
|----------|------|
| Historical subscriptions | Bound Version + **immutable Snapshot** (**CC-13**) |
| Historical invoices | Never rewrite; use snapshot + charge lines |
| Historical reports | Consume snapshots |
| Historical pricing | Published rows immutable; snapshot holds contracted price |
| Regional offers | Catalog regional policies; snapshot captures chosen region/currency |

---

## Commercial governance

Commercial configuration belongs **only** to the Commercial Catalog Platform (including regional policies).

| Consumer | Role |
|----------|------|
| Subscription Platform | Consumes Catalog; **persists Commercial Snapshot** at activation |
| Billing | Consumes pricing/region/tax-policy refs — does not own them |
| Entitlement | Consumes Snapshot feature/limit facts (and/or Version via Snapshot) |
| Portal | Consumes / presents |
| Reporting | Consumes snapshots |

---

## Alignment

- Subscription SP-17 / SP-18 / SP-19 / SP-20 (snapshot complements SP-18 for commercial contracts)  
- Tenant Identity attachment of subscriptions to Canonical Tenant ID  
- RBAC for who may publish versions / migrate customers  
