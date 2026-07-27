# DASHBOARD REVIEW

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | Dashboard Review |
| **Date** | 2026-07-27 |
| **Primary surface** | `ReportsTab` + child sections |

---

## Current information architecture

```
Reports & Statistics
├── Catalog Overview (Categories / Items / Visits)     ← non-financial
├── Check Revenue Analytics
│   ├── Overview (lifetime Gross/Net/…)                ← period bug
│   ├── Trends (day/week/month grouping)
│   └── Payment Method Analysis (month-scoped from selector)
├── Order Sales (today + month cards + rollups)
└── Excel export (month/year using selector)
```

---

## Problems (executive UX)

| # | Problem | Impact |
|---|---------|--------|
| 1 | Overview not bound to month/year selector | Owner cannot trust “this month” on screen vs Excel |
| 2 | Catalog KPIs lead the financial reports page | Cognitive load; Toast/Square put catalog elsewhere |
| 3 | Refunds fragmented / mostly Excel-only | Incomplete financial story on screen |
| 4 | Tax absent on live dashboard | Controller must export |
| 5 | Trends period not obviously tied to selector | Ambiguous |
| 6 | Payment refund mix computed but hidden | Dead capability |
| 7 | Dual Check vs Order is correct but poorly progressive | Both domains compete at once |

---

## Target progressive disclosure (presentation)

```
1. Period control (Month | Year) — single source for all sections
2. Executive strip (period): Check Revenue · Net Revenue · Refund Rate · Paid Checks
3. Financial detail: Tax · Average Check · Comp · Void
4. Refunds (unified): Count · Amount · Rate · Net · by Payment Method · Trend
5. Payments: tender mix (non-revenue)
6. Order Sales (ops dual-metric)
7. Trends
8. Export Excel (same period)
```

Catalog → Settings or secondary “Menu insights” — not first viewport.

---

## Keep / Merge / Rename / Remove (dashboard)

| Item | Action |
|------|--------|
| Check Revenue / Net / Paid / Avg / Comp cards | **Keep** — bind to period |
| Trends | **Keep** — bind to period |
| Payment Analysis | **Keep** — show or link refund mix |
| Order Sales block | **Keep** |
| Catalog Overview | **Remove** from Reports first viewport (move) |
| Unified Refund section | **Add** (presentation of existing DTO fields) |
| Tax card | **Add** from existing `taxCollected` |
| Lifetime unbounded Overview | **Remove** behavior |

---

## Adjacent boards

| Surface | Action |
|---------|--------|
| Home Operational Snapshot | Keep ops; keep Today’s Order Sales labeled |
| Sessions KPIs | Keep Today’s Check Revenue labeled; share ops card component |
| Do not merge Check Revenue into Order Sales | Constitutional dual-metric |

**No financial calculation changes.**
