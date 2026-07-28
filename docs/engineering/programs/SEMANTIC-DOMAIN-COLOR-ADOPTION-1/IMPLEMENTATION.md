# IMPLEMENTATION — SEMANTIC-DOMAIN-COLOR-ADOPTION-1

**Date:** 2026-07-28  
**Status:** COMPLETE — awaiting Architecture Authority approval  
**Do not commit / push / deploy**

---

## 1. Token governance

Extended `tokens/domain.ts` (single owner):

| Export | Role |
| --- | --- |
| `SEMANTIC_DOMAIN_HEX` | Canonical hex (aligned to Landing + program) |
| `SEMANTIC_DOMAIN_SURFACE` | Soft filled shells (summary / feature) |
| `SEMANTIC_DOMAIN_ACCENT` | **KPI/ticket** border + hover glow + icon (no flood) |
| `semanticDomainAccentClass` | Compose soft accent |
| `semanticDomainIconClass` | Domain icon color |
| `semanticDomainToTone` | Domain → nearest tone |

Landing CSS vars updated: QR → `#fbbf24`, information/lang → sky.

---

## 2. KPI API

`SemanticKpiCard` gained optional `domain?: SemanticDomain`:

- Sets `data-domain` for ambient CSS
- Applies `semanticDomainAccentClass` (skipped on primary amber hero)
- Domain owns icon color when present

No new components. No second card system.

---

## 3. Ambient CSS

`.semantic-card[data-domain="…"]::before` radial washes for all 11 domains (premium interaction layer).

---

## 4. Call-site adoption (presentation only)

Restaurant reporting, sessions, orders workspace, dining summary, fleet, kitchen/ops/board tickets, admin/commercial KPIs, print status, Dashboard home stats — domain props / soft accents wired.

Layouts, spacing, typography, business logic unchanged.

---

## 5. Guards

`semanticDomainColorAdoption.architecture.guards.test.ts` — **6/6 PASS**  
With related suites: **19/19 PASS**
