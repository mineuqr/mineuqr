# AUDIT — REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1

**Date:** 2026-07-28  
**Status:** COMPLETE  
**Visual SSOT:** Reporting Platform executive category surfaces (`SEMANTIC_CATEGORY_SURFACE`)  
**Do not commit / push / deploy**

---

## 1. Pre-state gap

| Layer | Surface language |
| --- | --- |
| Reporting executive cards | Full tinted gradient + semantic border + category glow (**canonical**) |
| `SemanticKpiCard` + domain | Soft **border/glow accent** on cyan `SEMANTIC_PANEL_BASE` |
| Kitchen / Ops / Fleet / Board tickets | Soft domain accent on neutral panel |
| Register tender summary | `SEMANTIC_PANEL_BASE` **stacked** with category shell (fighting chrome) |
| Shift closing dialog cards | Local `border-*/25 bg-*-950/15` approximations |
| Cash drawer / print status | Domain via `semanticCardTypeClass` but still mixed with cyan base |

Result: domain identity lived mostly on **borders and icons**, not inside the card surface. Reporting and the rest of the app did not read as one premium language.

---

## 2. Reporting recipe (SSOT — do not duplicate)

Canonical tokens: `client/src/design-system/semantic-card/tokens/category.ts` → `SEMANTIC_CATEGORY_SURFACE`.

| Category | Shell pattern |
| --- | --- |
| cash | `border-emerald-500/45` + `from-emerald-950/50` → slate |
| card | `border-sky-500/45` + `from-sky-950/45` → slate |
| refund | rose family |
| tax | violet family |
| orders | orange family (Reporting-specific) |
| net | teal family (layout col-span stripped for domain reuse) |
| neutral | cyan / slate (structural only) |

Each surface includes: **tinted gradient fill · semantic border · matching hover glow**.

---

## 3. Domain → Reporting mapping

| Domain | Reporting category | Notes |
| --- | --- | --- |
| payments · revenue | cash | Emerald custody / money |
| orders · information | card | Sky operational / info |
| kitchen | tax | Violet kitchen / tax family |
| growth | net | Teal; `sm:col-span-2` stripped |
| danger | refund | Rose |
| analytics · qr · success · warning | Reporting **template** | Same shell/glow structure; existing domain hexes (no new hues) |

Helper: `semanticDomainReportingSurfaceClass(domain)` = `shell + glow`.

---

## 4. Controlled change (what this program does / does not)

**Does**

- Replace neutral + colored-border accents with Reporting tinted surfaces on business cards
- Make `SEMANTIC_DOMAIN_SURFACE` derive from Reporting category surfaces where mapped
- Route KPI / cardType / ops / register through one helper

**Does not**

- Redesign layouts, typography, spacing, or interaction models
- Raise glow or saturation beyond existing Reporting / intensity calibration tokens
- Introduce new color families or libraries
- Recreate Reporting shells page-by-page

---

## 5. Surfaces audited for adoption

Dashboard KPIs · Sessions · Orders · Kitchen tickets · Fleet · Register summaries · Shift closing · Print status · Admin / commercial / security KPIs · Reporting executive (already SoT) · Landing ambient via shared `data-domain` CSS

---

## 6. Allowed remaining neutrals

| Surface | Reason |
| --- | --- |
| Auth / Profile / settings form Cards | Structural chrome, not domain metrics |
| Dialogs / sheets (chrome) | Modal frame — content cards may still be semantic |
| Empty / inset / supporting panels | `semanticPanel.empty` / `inset` |
| Urgency SLA border overlays on tickets | Operational emphasis on top of domain surface |
| Deprecated `semanticDomainAccentClass` | Retained for non-business chrome only |
