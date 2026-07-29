# COMMERCIAL-CATALOG-LOCALIZATION-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-CATALOG-LOCALIZATION-1 |
| **Type** | Platform Localization & Commercial Presentation |
| **Mode** | Architecture Authority |
| **Date** | 2026-07-29 |
| **Prerequisites** | FOUNDATION-1 · ADOPTION-1 · MANAGEMENT-UI-1 · ADMIN-EXPERIENCE-1 |
| **Constraints** | Architecture only · No commits · No deployment · No payment / subscription runtime changes |

---

## Mission

Transform Commercial Catalog into a **fully localized global SaaS commercial platform**: multiple languages, multiple *display* currencies, RTL/LTR, and country-aware presentation — while **Commercial Catalog remains the sole commercial SSOT** and **USD remains the immutable financial reference**.

Localization is a **presentation concern**. Commercial facts remain immutable.

---

## Index

| Document | Purpose |
|----------|---------|
| [LOCALIZATION-ARCHITECTURE.md](./LOCALIZATION-ARCHITECTURE.md) | Layers, laws, ownership boundaries |
| [CURRENCY-AND-COUNTRY-FLOWS.md](./CURRENCY-AND-COUNTRY-FLOWS.md) | USD policy, country detection, FX/override resolution |
| [TRANSLATION-AND-RTL-COVERAGE.md](./TRANSLATION-AND-RTL-COVERAGE.md) | AR/EN, RTL/LTR, formatting, SEO |
| [COMMERCIAL-PRESENTATION.md](./COMMERCIAL-PRESENTATION.md) | Public dual-price UX, admin USD-only edit + preview |
| [SUCCESS-CRITERIA.md](./SUCCESS-CRITERIA.md) | Architecture verification matrix + runtime gap map |
| [REGRESSION-SUMMARY.md](./REGRESSION-SUMMARY.md) | Preservation of Catalog SSOT / prohibited forks |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Authority verdict |

---

## Non-actions

- No commits  
- No deployment  
- No schema/migration execution in this program  
- No payment gateway / subscription entitlement changes  
- No duplicated commercial catalogs or country-specific DB forks  

---

## Relationship to prior Catalog laws

| Prior | Relationship |
|-------|----------------|
| **CC-01…CC-16** | Preserved. Catalog remains SSOT. |
| **CC-15 Regional Policies** | Remain authoritative for *regional commercial presentation overrides* and eligibility — **not** alternate stored canonical currencies. |
| **PRC-04** (multi-currency expansion) | **Amended by this program:** stored commercial amounts are **USD-only**; local currencies are **presentation** (regional override or FX). |
| **MANAGEMENT-UI / ADMIN-EXPERIENCE** | Surfaces remain hosts; all strings/formatting must consume platform localization. |
