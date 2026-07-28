# TABLE-PLATFORM-ARCHITECTURE-1 — Executive Summary

**Program type:** Architecture Investigation (read-only)  
**Date:** 2026-07-28  
**Code modified:** None  

---

## Conclusion

# B) MineuQR requires a canonical Table Platform and a new implementation program: TABLE-PLATFORM-ADOPTION-1

---

## Why (evidence, not assumption)

| Finding | Evidence |
| --- | --- |
| **14 distinct table UIs**, zero shared DataTable | Inventory across `client/src` |
| **shadcn `ui/table.tsx` unused** (0 consumers) | Grep: no imports of `@/components/ui/table` |
| **Admin opsTable forked 5×** | Accounts, Tenants, AuditTimeline, RoleChanges, SubscriptionChanges share markup + `adminDash.opsTable*` |
| **Reporting ledgers forked 3×** | SettlementHistory, PaymentMethodAnalysis, RefundAnalytics — same `min-w` + overflow + slate thead |
| **Ad-hoc HTML tables 4×** | PaymentHistory, StatisticsPanel, CommercialVisibilityDiagnostics, GateTable |
| **Status presentation inconsistent** | SemanticBadge (Accounts/Fleet) vs shadcn Badge vs local color spans (`PaymentHistory.getStatusColor`) |
| **Responsive inconsistent** | Admin: desktop table + mobile list; Reporting/Payment: scroll-only; Fleet: virtualized CSS-grid |
| **Capabilities uneven** | Sorting only on Fleet; real page pagination only SettlementHistory; selection/bulk **nowhere** |

This matches the pre-Semantic-Card state: many parallel presentations, one unused primitive, no single owner.

---

## What a Table Platform should own (proposed)

Presentation only — data remains feature-owned:

- `SemanticTable` (shell + a11y)
- Column definition contract
- Toolbar / filters chrome
- Pagination / load-more chrome
- Empty / loading / error / skeleton
- Density / responsive strategy (scroll vs card fallback)
- Action column slot
- Status cell → **SemanticBadge only**

**Out of platform (stay domain):** Fleet virtualization engine, WorkingHours editor matrix, dining-table **boards** (cards), Kitchen tickets.

---

## Next program

**TABLE-PLATFORM-ADOPTION-1** — phased adoption starting with Admin opsTable five-pack, then reporting ledgers, then ad-hoc commercial/payment tables.

See companion reports in this folder for full inventory and ADR outline.

---

## Gate

Investigation only. No commit / push / deploy / implementation.
