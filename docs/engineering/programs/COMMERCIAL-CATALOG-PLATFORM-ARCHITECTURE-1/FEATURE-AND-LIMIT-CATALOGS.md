# Feature & Limit Catalogs

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Feature Catalog

**CC-06:** Features are **globally identified**.

Features exist independently of Plans and Versions.

Examples: AI · Kitchen · POS · Inventory · Analytics · Reservations · Multi Branch · Customer App · Realtime · QR Ordering · …

| Rule | Statement |
|------|-----------|
| Stable Feature Key | Immutable commercial contract (aligns Subscription **SP-17**) |
| Version references | Plan Version → Feature Bundle → Feature Keys |
| Version never owns | Feature definitions live in Feature Catalog |
| Domains | Evaluate entitlements by Feature Key — never Plan (**SP-19**) |

A Plan Version **references** Features via a Feature Bundle. It never embeds feature semantics.

---

## 2. Feature Bundle

Reusable named set of Feature Keys attached to one or more Plan Versions (or cloned into a Version at publish).

Bundles may evolve by creating **new bundle revisions** — published Versions keep the bundle revision they were published with (snapshot).

---

## 3. Limit Catalog

**CC-07:** Limits are **reusable resources**.

Examples: Branches · Users · Storage · Orders · Products · QR Menus · AI Credits · Sessions · Devices · Exports · API requests · …

| Binding | On Plan Version Limit Profile |
|---------|-------------------------------|
| limitKey | Global limit id |
| quota / unlimited | Quantity |
| policy | soft / hard / grace |
| period | calendar / rolling / none |

Limits are referenced by Plan Versions; metering evaluation remains Subscription/Limit runtime (future) — Catalog owns definitions and version bindings.

---

## 4. Alignment with Subscription Architecture

| Subscription principle | Catalog role |
|------------------------|--------------|
| SP-17 Feature Identity Stability | Feature Catalog SSOT here |
| SP-20 Commercial Evolution | New Versions rebundle features |
| Plans Are Presentation / Features Are Contracts | Plan Identity presentation family; Features contracts; Version = packaged contract |

---

## 5. Anti-patterns

| Forbidden | Why |
|-----------|-----|
| Feature owned inside a single Plan row | Breaks reuse |
| Renaming Feature Key for marketing | SP-17 / CC-06 |
| Limit hardcoded in domain by plan name | SP-19 |
| Mutating Version feature set after publish | CC-02 / CC-04 |
