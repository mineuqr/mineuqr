# REFUND REVIEW

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | 4 — Refund Reporting |
| **Date** | 2026-07-27 |
| **Financial law** | Unchanged — Gross immutable; Net = Gross − refund publications (REFUND-REPORTING-ADOPTION-1) |

---

## Current refund presentation inventory

| Element | Live dashboard | Excel | Notes |
|---------|----------------|-------|-------|
| Refund Count | No | Financial | Gap |
| Refund Amount (`refundPublishedTotal`) | No | Financial as “Refund Publications” | Gap on live |
| Refund Percentage (`refundRate`) | No | Financial | Gap |
| Net Sales After Refunds (`netRevenue`) | Overview only | Financial | Present; period mismatch on live |
| Refund Trend | No | Trends remain Gross charts | Gap |
| Refund by Payment Method | Computed in VM; **not rendered** live | Payment sheet refund mix | Live gap |
| Refund by Operator | **Absent** | Absent | Needs Custody Attribution read |
| Refund by Register | **Absent** | Absent | Needs Custody Attribution read |
| Refund by Business Day | Possible via day trend + refund fields on DTO | Not dedicated | Defer presentation |
| Refund by Calendar Month | Year trend grouping | Not dedicated refund sheet | Defer |

---

## Target unified Refund section (presentation design — not implemented)

### Dashboard

```
Refunds
├── Refund Count
├── Refund Amount (label: Refund Publications)
├── Refund Rate
├── Net Revenue (after refunds)
├── Refund Trend (inherit period semantics)
└── Refund by Payment Method
```

Operator / Register breakdowns: **Phase 2+** after custody attribution reporting read model (ADR-033 FC-REP) — consume Attribution events; **do not** recalculate refund money.

### Excel

| Change | Intent |
|--------|--------|
| Add dedicated **Refunds** sheet **or** clearly titled Refund block inside Financial | Single executive place |
| Keep Payment sheet refund mix as tender detail only | Avoid duplicating Count/Rate |
| Trends: optional Net/Refund series as additive chart | Do not replace Gross chart SSOT |

---

## Duplication to remove (presentation)

| Duplicate / fragment | Action |
|----------------------|--------|
| Net on Overview without other refund KPIs | Move Net into Financial + Refund groups; Overview may show Net as headline only if period-aligned |
| Refund KPIs only in Excel | Mirror on dashboard Refund section |
| Payment refund rows hidden live | Render or link from Refund section |

---

## Constitutional constraints

| Must not | Why |
|----------|-----|
| Change Net formula | ADR-032 / REFUND-REPORTING |
| Treat RF document as cash left drawer | ADR-033 |
| Invent refund nets in UI | FC-REP / RF-REP |
| Use Expected Cash as Refund Amount | Custody ≠ money |

---

## Disposition

| Item | Disposition |
|------|-------------|
| Unified Refund section | **Approve for UX adoption** (presentation) |
| Refund by Operator/Register | **Defer** — depends on Attribution reporting |
| Formula changes | **Forbidden** |
