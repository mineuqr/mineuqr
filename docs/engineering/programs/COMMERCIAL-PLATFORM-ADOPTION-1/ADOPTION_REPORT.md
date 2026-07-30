# ADOPTION_REPORT.md — COMMERCIAL-PLATFORM-ADOPTION-1

## Outcomes

| Surface | Status | Notes |
|---------|--------|-------|
| Admin Console Catalog CRUD | **Adopted** (pre-existing) | `commercialCatalog.*` |
| Admin Publishing Workflow | **Adopted** | `commercialCatalog.publishing.*` via `useCatalogPublishingMutations` |
| Public Website Pricing | **Adopted** | `commercialCatalog.public.listOfferings` |
| Subscription Screens (entitlement display) | **Adopted** | `commercial.getEntitlements` → Runtime hub |
| CS Admin plan picker | **Adopted** | `listPublishedOfferings` |
| Capability presentation | **Adopted** | Catalog `featureKeys` + localized catalog feature labels (aligned with Capability Discovery vocabulary) |
| Commercial version presentation | **Adopted** | Public offerings expose published `versionCode` / `versionName` only |
| Platform Ops Subscription placeholder | **Unchanged** | No commercial APIs (architecture shell; no legacy to remove) |

---

## Architecture compliance

| Rule | Result |
|------|--------|
| No screen implements commercial logic locally for authz | Pass — gates via entitlements hook |
| No screen evaluates entitlements | Pass — displays Runtime facts only |
| No screen evaluates subscription lifecycle for authz | Pass — messaging uses Runtime context |
| No screen reads mutable Catalog for runtime decisions | Pass — Public Catalog is presentation only (I-CPP-01) |
| Subscription Runtime exclusive authority | Pass (I-SRE-01) |
| Commercial Snapshot runtime contract | Pass (I-CPL-13) |

---

## Publishing workflow adoption

| Action | UI |
|--------|----|
| Approve | Versions + Publication panels |
| Schedule | Versions + Publication (default +24h) |
| Publish | Versions, Publication, Wizard, Bulk, Diff (approve-then-publish) |
| Deprecate / Retire / Archive | Versions + Publication |
