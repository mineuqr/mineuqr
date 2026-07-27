# Domain Authority Matrix

| Field | Value |
|-------|-------|
| **Program** | CROSS-DOMAIN-GOVERNANCE-1 |
| **Constitution** | CD-01 · CD-05 |
| **Date** | 2026-07-27 |

## Authority by platform domain

| Platform Domain | Sovereign authority (owns) | MUST NOT own | Primary ADRs / law anchors |
|-----------------|----------------------------|--------------|----------------------------|
| **Order Platform** | Order aggregate, lines, lifecycle, operational totals | Financial settlement truth; Register custody; Reporting formulas | ADR-ARCH-001, 007; Ordering Invariants |
| **Settlement Platform** | Financial settlement plane; Settlement Record publications; Check money path | Order lifecycle write; Register money ownership; Reporting inventing revenue | ADR-ARCH-020, 022, 023, 026, 032, 033 |
| **Reporting Platform** | KPI dictionary presentation, reporting services, exports, Reporting Constitutions | Financial truth; Order write; mutating Settlement Records | Reporting Constitutions; KPI Ownership |
| **Register Platform** | Register / cash custody & attribution | Check money ownership; inventing Total Sales | ADR-ARCH-028, 030 |
| **Session Platform** | Session operational lifecycle (where graduated) | Order aggregate; Settlement Record authority | Architecture §2 / Session graduation |
| **Kitchen Platform** | Kitchen queue / display fulfillment views | Order write co-authority; financial KPIs | Future Kitchen programs; Order events consumer |
| **Menu Platform** | Catalog / menu structure & pricing support (via ACL) | Order lifecycle; Settlement publications | MenuPricingACL; catalog KPIs |
| **Device Platform** | Device identity / connectivity | Business financial truth; Order mutations | Device/platform ADRs as published |
| **Waiter Platform** | Waiter operational UX / workflows consuming Order | Order domain logic in UI; financial SoT | Presentation consuming Order contracts |
| **Future Platforms** | As declared at admission (CD-06) | Any undeclared overlap | Required before production |

## Dual-layer note (Settlement)

| Plane | Authority |
|-------|-----------|
| Settlement Platform (financial plane) | Product / custody-of-truth plane for settled money publications |
| Check Management / Check Aggregate | Write owner of Settlement Record publications |

Not an ownership overlap: plane vs write owner (aligned with Reporting KPI Ownership clarification and ADR-ARCH-033 custody plane).

## Sovereignty rule

If two domains claim the same write authority → **CD-01 violation** → resolve via CD-04 / ADR.
