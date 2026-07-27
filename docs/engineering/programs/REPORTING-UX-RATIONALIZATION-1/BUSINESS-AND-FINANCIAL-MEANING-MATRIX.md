# BUSINESS AND FINANCIAL MEANING MATRIX

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phases** | Meaning matrices (deliverables 3–4) |
| **Date** | 2026-07-27 |

---

## Business Meaning Matrix

| KPI / element | Business question answered | Audience | Must not be confused with |
|---------------|---------------------------|----------|---------------------------|
| Check Revenue | How much did paid checks total (gross)? | Owner, Manager, Controller | Order Sales, Tender totals, Net |
| Net Revenue | What remains after published refunds? | Owner, Controller | Gross, Expected Cash |
| Refund Publications | How much refund money was published? | Controller, Manager | Register cash out, Gross |
| Refund Count | How many refund documents? | Manager | Voided checks |
| Refund Rate | What % of Gross was refunded? | Owner, Manager | Comp rate |
| Paid Checks | How many checks were paid? | Manager | Orders completed |
| Average Check | Typical paid check size? | Owner, Manager | Average Order |
| Tax Collected | Tax on paid checks (frozen snapshot)? | Controller, Accountant | Live tax settings |
| Complimentary * | Free / hospitality leakage? | Manager | Refunds |
| Voided Checks | Voided financial outcomes? | Manager | Refunds |
| Order Sales | Value of completed (served) orders? | Ops Manager | Check Revenue |
| Completed Orders | How many orders served? | Ops | All Orders placed |
| Orders (orderCount) | How many orders placed? | Ops | Completed Orders |
| Average Order | Typical completed order size? | Ops | Average Check |
| Payment Method mix | How did guests tender? | Manager, Cashier lead | Check Revenue |
| Active Sessions / Tables | Floor load now? | Floor Manager | Revenue |
| Catalog / Visits | Menu scale / interest? | Marketing/Ops | Financial performance |
| Expected Cash / Variance | Drawer custody? | Cashier / Manager | Revenue (ADR-033) |

---

## Financial Meaning Matrix

| KPI id | Financial class | Formula owner | Publication basis | Accounting note |
|--------|-----------------|---------------|-------------------|-----------------|
| `revenue` | Gross | Aggregated from SR by Reporting | Paid gen=1 settlement/void | Immutable Gross law |
| `refundPublishedTotal` | Contra / compensating | Aggregated from refund SR | `recordKind=refund` | Not a Gross mutation |
| `netRevenue` | Derived Net | Reporting Platform | Gross − refund pubs | Presentation/derived — not second SSOT writer |
| `refundRate` | Ratio | Reporting Platform | refund/gross | 0 if gross=0 |
| `refundPublicationCount` | Count | Reporting | refund SR count | Document count |
| `taxCollected` | Tax | Aggregated from SR taxAmount | Paid gen=1 snapshot | Not live settings |
| `paidCheckCount` | Volume | Count | Paid gen=1 | |
| `averageCheck` | Average | revenue/paidCount | | |
| `complimentaryCount/Amount` | Non-revenue outcome | SR complimentary | | Not Net |
| `voidedCount` | Non-paid outcome | SR voided | | Not Refund |
| `orderSales` | Operational sales | Order Read | completedSales | Dual-metric peer |
| Payment tender totals | Tender analytics | Payment analytics | SR payment snapshot | Never labeled as Revenue |
| Custody Expected Cash | Custody | CRMP | Attribution + movements | Never Revenue (ADR-033) |

---

## Accounting review notes (CPA lens)

| Role | Clarity today | Gap |
|------|---------------|-----|
| **Restaurant owner** | Dual Check vs Order labels mostly clear | Lifetime Overview vs selected month confuses “how did we do this month?” |
| **Manager** | Ops + Gross present | Missing unified Refund panel on live UI |
| **Controller / accountant** | Excel Financial is closest to usable | Needs period-aligned Gross→Refund→Net→Tax stack; Refund by Register/Operator absent |
| **Cashier** | Shift close reports separate | Must not see Expected Cash as Revenue |

**Nothing in this matrix authorizes formula changes.**
