# RISK ASSESSMENT

**Program:** TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1

## Priority scale

| Rank | Meaning |
|------|---------|
| P0 | correctness / financial / security / data integrity |
| P1 | production contract / API / domain correctness |
| P2 | maintainability / developer safety |
| P3 | tooling / legacy / low-risk |

## Baseline 28

| Priority | Count | Notes |
|----------|------:|-------|
| P0 | 0 | No remaining diagnostic is an untyped financial *semantic* hole. |
| P1 | 1 | TDA-013 — `identity.restaurantId` was `undefined` at runtime on device order actions. **Remediated.** |
| P2 | 14 | Catalog currency, RQ structuralSharing, freeze readonly, Dashboard tax UI, kiosk tracking, mysql2 execute casts, legacy reporting predicate |
| P3 | 13 | Design-system tokens, Platform Ops UI, PDF tooling, UAT scripts, dash emptyPanel, MenuView label |

After FIX_NOW: **P0 = 0, P1 = 0.**

## Financial domain

| ID | Topic | Semantic invention required? |
|----|-------|------------------------------|
| TDA-020 | Dashboard tax policy readonly vs mutable | No — UI prop variance |
| TDA-023 | CRMP shift sequence | No — driver result typing |
| TDA-024 | Refund document sequence | No — same driver typing; refund identity module is separate and typed |
| TDA-025 | Order daily display number | No — same driver typing |
| TDA-026/027 | `"refundRate"` vs `ExecutiveSummaryCardId` | No — UAT script vs current KPI id union |

Do not modify financial contracts to clear these.

## Occupancy

Zero diagnostics in occupancy files or messages. No STOP.

## App.tsx / KioskShellRoute

App.tsx: **0**. The six historic Route/KioskShell errors remain absent. KioskShell.tsx TDA-021 is a **different** leftover (`tracking` stage), not a regression of those six.

## P0/P1 review before POS READ APIs

Only TDA-013 was P1. It is fixed. No remaining P0/P1. POS-READ-APIS may proceed from a TypeScript-remainder standpoint (this program does not start it).
