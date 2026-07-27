# Card Hierarchy Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-VISUAL-HIERARCHY-1 |
| **Date** | 2026-07-27 |

| Emphasis | Shell | Value type | Padding |
|----------|-------|------------|---------|
| primary | `kpiCardPrimary` (amber accent) | Larger revenue gradient | Generous |
| secondary | `kpiCardSecondary` | Standard revenue / ops | Standard |
| supporting | `kpiCardSupporting` (lighter border) | Standard, muted label | Compact |

Implementation: `RestaurantKpiCard` `emphasis` prop.
