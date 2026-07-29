# Compliance Report — COMMERCIAL-CATALOG-LOCALIZATION-LITERAL-SWEEP-1

**Date:** 2026-07-29

---

## Localization audit summary

| Check | Result |
|-------|--------|
| Automated literal scan (Catalog UI scope) | **0 findings** |
| `useCatalogI18n` / `cc()` adoption | **Yes** |
| Guard tests | **17/17 passed** (incl. 4 literal-sweep guards) |
| Architecture / pricing / FX / country / APIs | **Unchanged** |

---

## Hardcoded string audit

Scanner: `_scan-literals.mjs` → `_audit/literal-findings.json`

Scope: `commercial-catalog/**`, Catalog composition, dual-price components.

Result: **[]** (empty).

---

## Translation coverage report

| Locale | Keys under `admin.platformOps.commercialCatalog` |
|--------|--------------------------------------------------|
| English | 528 |
| Arabic | 528 |

Parity: **missingInAr = []**, **missingInEn = []**, **empty = []**, **identical user-facing AR/EN = 0**, **missingReferenced = []**, **ok = true**.

---

## Missing key report

Referenced keys missing from EN: **[]**

---

## Duplicate / orphan key report

| Class | Count | Notes |
|-------|------:|-------|
| Duplicate keys | 0 | Nested JSON trees; no duplicate leaf collisions detected |
| Active orphans (non-legacy) | See latest `_audit/key-parity-report.json` | Reduced after including `catalogUiHelpers` / `experienceNav` map references |
| Legacy reserved orphans | ~40 | Pre-sweep foundation copy (`section.*`, owns/principles blocks) retained for shell compatibility — not used by Catalog Experience UI |

---

## RTL / LTR verification

| Surface | Mechanism |
|---------|-----------|
| Catalog composition | `dir={language === "ar" ? "rtl" : "ltr"}` |
| Public dual-price / pricing | Locale `dir` from LanguageContext + component `dir` |
| Forms / dialogs / tables | Inherit document + composition direction |

No layout logic forks — presentation-only direction.

---

## Accessibility verification

Localized via `a11y.*` keys (experience nav, manage modules, search, dialogs). Form fields use localized `CatalogField` labels. Dialog Cancel/Save localized in `CatalogFormDialog`.

---

## Regression summary

| Area | Status |
|------|--------|
| Commercial Catalog architecture | Unchanged |
| Pricing / FX / country / regional override | Unchanged |
| Subscription / entitlements | Unchanged |
| API contracts / schema / storage / snapshots | Unchanged |
| Runtime behavior | Localization compliance only |

---

## Final compliance matrix

| Criterion | ✓ |
|-----------|---|
| Zero hardcoded user-facing strings (scoped Catalog UI scan) | ✓ |
| 100% localization coverage (Catalog UI uses platform `t`/`cc`) | ✓ |
| Arabic fully translated (parity + non-identical leaves) | ✓ |
| English fully translated | ✓ |
| No missing translation keys (referenced) | ✓ |
| No duplicate translation keys | ✓ |
| Orphan keys explained (legacy reserved vs active) | ✓ |
| RTL verified (wiring) | ✓ |
| LTR verified (wiring) | ✓ |
| Accessibility localization verified | ✓ |
| No UI architectural regressions | ✓ |
| No runtime commercial regressions | ✓ |
| No architectural / business / pricing changes | ✓ |
| Compliant with LOCALIZATION-1 presentation laws | ✓ |
