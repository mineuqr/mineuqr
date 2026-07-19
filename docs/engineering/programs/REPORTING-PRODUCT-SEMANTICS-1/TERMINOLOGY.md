# REPORTING-PRODUCT-SEMANTICS-1 — Canonical Terminology

## Purpose

Standardize restaurant-facing KPI labels so users cannot reasonably confuse Check Revenue with Order Sales (or Settlement / Gross Sales synonyms).

**Does not change** KPI ids, formulas, DTOs, or Reporting APIs.

## Preferred labels (authoritative)

Source: `shared/reporting-platform/productSemantics.ts` + `KPI_DICTIONARY.name`.

| KPI ID | Preferred EN | Preferred AR | Business meaning |
|--------|--------------|--------------|------------------|
| `revenue` | Check Revenue | إيرادات الشيكات | SUM(paid Check grandTotal) |
| `orderSales` | Order Sales | مبيعات الطلبات | Order Read completed sales |
| `averageCheck` | Average Check | متوسط الشيك | Check Revenue / Paid Checks |
| `averageOrder` | Average Order | متوسط الطلب | Order Sales / Completed Orders |
| `dailySales` | Daily Check Revenue | إيرادات الشيكات اليومية | Check Revenue by day |
| `paidCheckCount` | Paid Checks | الشيكات المدفوعة | Count of paid Checks |
| `taxCollected` | Tax Collected | الضريبة المحصّلة | Tax on paid Checks (snapshot) |
| `completedOrders` | Completed Orders | الطلبات المكتملة | Served order count |
| `orderCount` | Orders | عدد الطلبات | All orders placed (P-10 `orderCount`) |

**REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1:** When Order Sales is shown next to a count (Dashboard Order Sales section, Executive Summary), use **Completed Orders** — not bare Orders — so the population matches Order Sales / Average Order.

Full map includes operational and catalog KPIs in `PREFERRED_KPI_LABELS`.

## Deprecated presentation labels

Do **not** use these as primary labels for Check Revenue:

- Revenue (bare)
- Paid Revenue
- Settlement / Settlement Revenue
- Gross Sales / Sales / Net Revenue
- الإيرادات / المبيعات (bare, without “الشيكات” / “الطلبات”)

Do **not** use these as primary labels for Order Sales:

- Revenue / Check Revenue
- Gross Sales / Paid Revenue / Settlement

## Clarifications (Reporting Basis)

- Check Revenue = sum of paid Check totals (**not** Order Sales).
- Order Sales = completed (served) order totals (**not** Check Revenue).
- Average Check ↔ Check domain; Average Order ↔ Order Read domain.

## Presentation rules

1. Restaurant UI and Excel/PDF labels MUST use `preferredKpiLabel` / aligned export labels.
2. Section titles that show Check money MUST say “Check Revenue”, not bare “Revenue”.
3. Component file names may retain historical “Settlement*” — user-visible copy must not.
4. Never invent a new money KPI label that aliases an existing id.

## Future naming guidelines

1. Prefer domain noun + metric (“Check Revenue”, “Order Sales”).
2. Avoid single-word money labels (“Revenue”, “Sales”).
3. Pair Average * with the same domain noun (Check vs Order).
4. Change `KPI_DICTIONARY.name` and `PREFERRED_KPI_LABELS` together; never bump `calculationVersion` for label-only edits.
