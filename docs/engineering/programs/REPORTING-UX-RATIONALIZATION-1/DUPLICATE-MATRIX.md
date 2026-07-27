# DUPLICATE MATRIX

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | 2 — Duplicate Analysis |
| **Date** | 2026-07-27 |
| **Rule** | Nothing removed until duplicate proven |

Provenance: **Proven** = same business meaning shown in ≥2 live or export surfaces without intentional dual-metric separation.

---

## A. Duplicated KPIs / values

| Meaning | Surfaces | Same formula? | Same period? | Proven duplicate? | Recommendation |
|---------|----------|---------------|--------------|-------------------|----------------|
| Check Revenue (Gross) | Overview card; Excel Financial; (Sessions “Today’s Check Revenue” scoped differently) | Yes (registry) | **No** (lifetime vs month vs today) | **Partial** — same meaning, inconsistent scope | Unify period; keep one primary card per scope |
| Net Revenue | Overview; Excel Financial | Yes | **No** | **Partial** | Same |
| Paid Checks | Overview; Excel Financial | Yes | **No** | **Partial** | Same |
| Average Check | Overview; Excel Financial | Yes | **No** | **Partial** | Same |
| Complimentary Checks | Overview; Excel Adjustments | Yes | **No** | **Partial** | Keep; align period |
| Order Sales | Reports Order section; Home snapshot (today); Excel Exec + Order Sales sheet | Yes | Mixed today/month/scope | **Partial** | Intentional dual-metric; demote catalog clutter |
| Completed Orders | Reports Order; Excel Exec | Yes | Mixed | **Partial** | Keep paired with Order Sales |
| Refund Publications / Count / Rate | Excel Financial (+ Payment refund mix); **not** live Overview (except Net) | Yes | Export period only | **Fragmented** — not classic dup | **Unify Refund section** (add live; consolidate Excel) |
| Tax Collected | Excel Financial only (live absent) | Yes | Export | **Not duplicate** — gap | Add to Financial group on dashboard |
| Payment tender totals | Live Payment section; Excel Payment; Shift tender card | Related builders | Different scopes | **Adjacent** | Keep; distinct products |
| Active Sessions / Occupied Tables | Home OperationalSnapshot; Sessions workspace | Yes | Live | **Proven** | Merge pattern / single component |
| MRR / ARR / plan distribution | Admin home + Commercial + StatisticsPanel | Yes (admin APIs) | Snapshot | **Proven (admin)** | Out of restaurant scope; cleanup aliases |

---

## B. Duplicated cards / sections

| Card / section | Locations | Proven? | Action |
|----------------|-----------|---------|--------|
| Ops KPI strip | Home + Sessions | Yes | Merge UX pattern |
| Check vs Order money story | Reports (both domains) + Excel (both) | Intentional dual-metric | **Keep both** — never merge formulas |
| Executive “At a Glance” | Excel only | No live twin | Consider live Executive strip (presentation) |
| Payment Method Analysis | Live + Excel | Intentional mirror | Keep; fix refund visibility parity |
| Catalog Overview | Reports tab top | Unique on Reports | Candidate remove from financial tab |

---

## C. Duplicated charts

| Chart | Locations | Proven? | Action |
|-------|-----------|---------|--------|
| Check Revenue Trend | Live SettlementTrends; Excel Trends sheet | Yes (same DTO family) | Keep mirror; align period |
| Paid / Comp trend charts | Live only | No | Keep |
| Order Sales trend (export) | Excel Order Sales sheet | Export-only | Keep |
| Admin growth / plan charts | Admin analytics | Orthogonal | N/A |

---

## D. Duplicated Excel sections / meanings

| Meaning | Excel locations | Proven? | Action |
|---------|-----------------|---------|--------|
| Refund money | Financial (Publications/Count/Rate/Net) + Payment (refund mix) | Related, not identical | Keep Financial as refund money SSOT presentation; Payment = tender breakdown only |
| Order Sales | Executive cards + Order Sales sheet | Related | Exec = glance; sheet = detail — OK if captions clear |
| Check Revenue | Financial + Trends | Related | OK |
| Reporting Basis notes | Financial footer | Unique | Keep |

---

## E. Duplicated business meaning (label risk)

| Risk | Evidence | Action |
|------|----------|--------|
| Bare “Revenue” / “Sales” | Deprecated list in Product Semantics; some chrome “Sales and order analytics” | Rename chrome only |
| “Settlement*” component names | SettlementOverviewSection etc. | Internal only — OK if UI copy says Check Revenue |
| Admin “Reports” vs restaurant Reports | Different domains | Clarify navigation copy |

---

## Removal gate

| Candidate | Proven duplicate? | Safe to remove now? |
|-----------|-------------------|---------------------|
| Catalog Overview on Reports | Not duplicate — wrong placement | UX remove/move only after Phase 7 approval |
| Live Overview lifetime unbounded | Conflicts with period UX — not a duplicate | Fix binding — do not remove KPI |
| Refund Payment rows on Excel | Complements Financial refund KPIs | Do not remove; relocate under unified Refund narrative |
| `/admin/reports` placeholder | Empty | Safe to redirect/remove shell |

**Phase 2 success criterion: Met — duplicates identified; no removals executed.**
