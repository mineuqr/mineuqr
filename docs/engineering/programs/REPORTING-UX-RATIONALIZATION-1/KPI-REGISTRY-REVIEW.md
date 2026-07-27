# KPI REGISTRY REVIEW

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | 6 — KPI Standardization (review) |
| **Date** | 2026-07-27 |
| **Code SSOT** | `shared/reporting-platform/kpiDictionary.ts` + `productSemantics.ts` |

---

## Canonical name rule

| Rule | Status |
|------|--------|
| One KPI id → one canonical EN/AR label | **Met** in Product Semantics |
| Dashboard / Excel / API labels must use `preferredKpiLabel` | **Mostly met**; export labels module aligned |
| No synonyms for Check Revenue / Order Sales | **Guarded** via `DEPRECATED_PRESENTATION_LABELS` + architecture tests |
| Payment Method analytics registered as KPI ids | **Gap** — produced by API but not in `KPI_DICTIONARY` |
| Refund by Operator / Register KPI ids | **Absent** (custody presentation future) |

---

## Registry coverage vs surfaces

| KPI id | Canonical name | Live dashboard | Excel | API DTO | Synonym risk |
|--------|----------------|----------------|-------|---------|--------------|
| revenue | Check Revenue | Overview | Financial / Trends | BusinessMetricsSummary | Low if chrome cleaned |
| netRevenue | Net Revenue | Overview | Financial | same | Must not replace Gross |
| refundPublishedTotal | Refund Publications | **Missing** | Financial | same | Prefer “Refund Amount” as *caption*? — **Decision**: keep registry name; optional subtitle “Refund amount published” |
| refundPublicationCount | Refund Count | **Missing** | Financial | same | OK |
| refundRate | Refund Rate | **Missing** | Financial | same | OK |
| paidCheckCount | Paid Checks | Overview | Financial | same | OK |
| taxCollected | Tax Collected | **Missing** | Financial | same | OK |
| averageCheck | Average Check | Overview | Financial | same | OK |
| complimentary* / voidedCount | Comp / Void | Partial | Financial | same | OK |
| dailySales | Daily Check Revenue | Trends axis | Trends | Trend points | OK |
| orderSales / completedOrders / averageOrder / orderCount | Order * | Order section / Home | Exec + Order | Order DTOs | Population note exists |
| activeSessions / occupiedTables / pendingOrders / … | Ops | Home / Sessions | No | Ops DTO | Dup across boards |
| catalog* / menuVisits | Catalog | Reports Overview | No | Catalog DTO | Misplaced on financial tab |

---

## Terminology standardization recommendations (labels only)

| Current | Canonical | Action |
|---------|-----------|--------|
| “Sales and order analytics” (subtitle) | “Check Revenue and Order Sales” | **Rename** chrome |
| “Reports & Statistics” | Keep or “Restaurant Reports” | Optional |
| “Refund Publications” | Keep (registry); add plain caption “Total refunded (published)” | Caption only — do **not** invent second KPI name |
| “Monetary Tender Total” | Keep section term; never call Revenue | Keep |
| Component `Settlement*` | Internal | No user rename required |

---

## Cross-platform name alignment

| Platform | Alignment |
|----------|-----------|
| Settlement Platform | Uses Settlement Record — Reporting says Check Revenue (correct dual language) |
| Refund Platform | Refund Document / RF — Reporting says Refund Publications / Count (correct) |
| Financial Custody Plane | Expected Cash ≠ Revenue — Reporting must not import custody labels as financial KPIs |
| Documentation | Some SOURCE-OF-TRUTH docs still say Check-row SSOT — **doc drift** vs SR default |

**No calculationVersion bumps required for this audit.** Label-only edits must not bump calculation versions.
