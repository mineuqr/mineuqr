# FINAL REPORT — REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1

**Date:** 2026-07-28  
**Type:** Semantic Surface Platform Adoption (Presentation Only)  
**Status:** READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Do not commit / push / deploy**

---

## Verdict

Reporting executive surfaces are now the **platform Single Source of Truth** for semantic business card chrome. Domain cards use tinted gradient + semantic border + Reporting glow instead of neutral panels with colored borders only. Landing, Dashboard, Operations, Commercial, Admin, and Reporting share one surface language.

---

## 1. Reporting surface primitives adopted

| Primitive | Source |
| --- | --- |
| Category shells / glows | `SEMANTIC_CATEGORY_SURFACE` |
| Domain mapping | `DOMAIN_TO_REPORTING_CATEGORY` + `SEMANTIC_DOMAIN_SURFACE` |
| Platform helper | `semanticDomainReportingSurfaceClass` |
| KPI adoption | `SemanticKpiCard` domain path |
| Card-type adoption | `semanticCardTypeClass` replaces panel base when `domain` set |
| Ambient lighting | Existing `.semantic-card` + `data-domain` CSS |

---

## 2. Migrated pages / surfaces

Dashboard KPIs · Sessions · Orders · Kitchen · Fleet · Payments / Revenue KPIs · Register cash + tender · Shift closing summary cards · Print status · Admin / commercial / security / statistics KPIs · Operational board tickets · Reporting executive (canonical reference)

---

## 3. Removed / retired neutral patterns

| Before | After |
| --- | --- |
| Soft domain accent on cyan panel (KPI/ops) | Full Reporting tinted surface |
| Tender: `SEMANTIC_PANEL_BASE` + category shell stack | Single Reporting orders surface |
| Shift closing local `bg-*-950/15` approximations | Reporting payments / orders surfaces |
| cardType domain = panel base + accent shell | Domain surface **replaces** panel base |

Deprecated: `semanticDomainAccentClass` retained for non-business chrome only.

---

## 4. Design system improvements

- One recipe path: Reporting → domain → KPI / cardType / tickets
- No page-local semantic surface inventions for migrated business cards
- Mapped domains reuse category shells **verbatim** (no approximate duplicates)
- Growth reuses `net` without layout col-span leakage

---

## 5. Remaining inconsistencies (acceptable / follow-up)

| Item | Notes |
| --- | --- |
| Structural cyan panels | Settings, empty, inset, auth forms — intentionally neutral |
| Primary hero KPI amber panel | Rare emphasis; FlowStrip preferred for Reporting heroes |
| Ticket SLA urgency borders | Overlay on Reporting surface (ops meaning, not domain chrome) |
| Dialog / sheet chrome | Modal frames remain structural |
| Landing feature cards | Still use Landing accent CSS bridge; hex/domain aligned — full shell parity already via Landing program |
| Non-card chips / alerts | Tone strips (`semanticTone`) are not business cards |

---

## 6. Performance & a11y

No new animation libraries · no layout/typography/spacing redesign · `prefers-reduced-motion` unchanged · color reinforces labels, not sole cue · readability preserved via slate gradient floors.

---

## Artifacts

- [AUDIT.md](./AUDIT.md)  
- [IMPLEMENTATION.md](./IMPLEMENTATION.md)  
- Guards: `client/src/design-system/semantic-card/__tests__/reportingSemanticSurfacePlatformAdoption.architecture.guards.test.ts`

**Awaiting Architecture Authority approval.**
