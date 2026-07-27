# Business Question Registry

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Constitution** | UX-01, UX-02, UX-03 |
| **Date** | 2026-07-27 |

Every Executive / primary reporting component maps to exactly one business question. Duplicate questions are prohibited.

## Executive Overview (health summary)

| Component (Business Name) | KPI id / card id | Business question | Section |
|---------------------------|------------------|-------------------|---------|
| Total Sales | `revenue` | How much did the business sell (financially)? | Overview |
| Sales Orders | `orderSales` | How much operational order activity occurred? | Overview |
| Orders | `orderCount` | How many orders were placed? | Overview |
| Refund Amount | `refundPublishedTotal` | How much was refunded? | Overview |
| Tax Collected | `taxCollected` | How much tax has been collected? | Overview |
| Payment Overview | `paymentOverview` *(presentation)* | How are customers paying (tender monetary total)? | Overview |

## Progressive disclosure (secondary questions)

| Component | Business question | Section |
|-----------|-------------------|---------|
| Net Sales | What remains after refunds (Total Sales − Refund Amount)? | Financial |
| Refund Rate | What share of Total Sales was refunded? | Financial |
| Average Check | What is typical paid-check value? | Financial |
| Average Order | What is typical completed-order value? | Sales / Financial secondary |
| Payment mix detail | Which tender methods and how much each? | Financial |
| Sales trends | How do sales move over days/months? | Sales |
| Top selling items | Which items sell most? | Sales |

## Anti-duplication rules (UX-03)

| Forbidden pair | Reason |
|----------------|--------|
| Total Sales + “Gross Sales” / “Check Revenue” as peer cards | Same financial question |
| Sales Orders + “Order Sales” under a different label | Same operational question |
| Net Sales on Overview + Total Sales answering “how much sold?” | Net answers a different question — keep Net off Overview |
| Two Payment charts with identical tender totals | Keep one clearer view |

## Registry maintenance

New components MUST register a unique business question here **before** implementation certification.
