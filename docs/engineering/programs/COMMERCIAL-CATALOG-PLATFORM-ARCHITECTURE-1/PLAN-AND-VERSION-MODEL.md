# Plan Identity & Plan Version Model

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Plan Identity

**Plan Identity** represents the commercial product.

Examples: Starter · Business · Enterprise · Professional · Custom  

| Plan Identity **has** | Plan Identity **never has** |
|----------------------|----------------------------|
| Stable commercial identifier (`plan.business`) | Pricing |
| Display name / presentation metadata | Limits |
| Optional marketing taxonomy | Feature grants |
| Lifetime across all versions | Mutable commercial terms |

**CC-01:** Plan Identity is immutable (id never reused for a different product).

Aligned with Subscription **Plans Are Presentation** — Identity is the stable packaging family; commercial substance lives on **Versions**.

---

## 2. Plan Version

Every commercial change creates a new **immutable Plan Version**.

Examples: Business v1 · Business v2 · Business v3  

| Field class (conceptual) | Examples |
|--------------------------|----------|
| Identity | `planVersionId`, parent `planId`, `versionLabel` |
| Commercial payload | Feature bundle refs, limit profile refs |
| Pricing refs | Price rows / price book entries |
| Cycle refs | Allowed billing cycles |
| Policy refs | Trial template, renewal hints, migration defaults |
| Lifecycle | Draft / Published / Deprecated / Retired |
| Audit | publishedAt, publishedBy, supersedesVersionId? |

**CC-02:** Published Plan Versions are immutable.  
**CC-04:** Commercial evolution creates new Versions — never edits published ones.

---

## 3. Version contents (composition)

```
PlanVersion
  ├── featureBundleId → Feature Keys[]
  ├── limitProfileId  → Limit Bindings[]
  ├── prices[]        → amount, currency, cycle, region?
  ├── allowedCycles[] → monthly | quarterly | yearly | custom
  ├── trialPolicyRef?
  ├── presentation    → names, badges, storefront flags
  └── migrationHints  → default policy when superseded
```

A Version **references** Features and Limits; it never owns the global Feature/Limit catalogs.

---

## 4. Subscription binding (**CC-03** · **CC-13**)

```
Subscription ──binds──► Plan Version ID
                 └──captures──► Commercial Snapshot (immutable)
```

**CC-03:** Subscriptions reference Plan Versions.  
**CC-13:** At activation, Subscription captures an immutable **Commercial Snapshot** independent of Catalog — see [COMMERCIAL-SNAPSHOT.md](./COMMERCIAL-SNAPSHOT.md).

| Benefit | Guarantee |
|---------|-----------|
| Historical integrity | Customer's commercial contract frozen in Snapshot |
| Reproducibility | Reports/invoices reconstruct from Snapshot even if Version retired |
| Evolution safety | New Version / Catalog edits do not rewrite Snapshots |
| Governed migration | Moves only to CC-14 allow-listed Versions; new Snapshot on success |

---

## 5. Administrator freedoms

Admins may: create Plans · create Versions · publish (**CC-16** gate) · deprecate · retire · change pricing **via new Version** · configure bundles/limits/trials on Draft · set migration + **compatibility** policies (**CC-14**) · configure **regional** prices/policies (**CC-15**).

They may **not:** silently mutate a Published Version's features, limits, or list prices; migrate to versions outside compatibility allow-lists; publish incomplete Drafts.
