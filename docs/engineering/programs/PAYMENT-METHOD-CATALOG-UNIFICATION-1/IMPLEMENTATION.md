# PAYMENT-METHOD-CATALOG-UNIFICATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | PAYMENT-METHOD-CATALOG-UNIFICATION-1 |
| **Type** | Production Adoption — presentation / catalog unification |
| **Date** | 2026-07-25 |
| **Verdict** | **PAYMENT METHOD CATALOG — PRODUCTION UNIFIED** |

---

## 1. Executive Summary

MineuQR now has **one canonical Payment Method catalog** for selection, display, analytics aggregation, Ops tender summaries, receipts, and reports:

| Internal key | Display (Arabic) |
|---|---|
| `cash` | نقدًا |
| `card` | بطاقة (شبكة / بنك) |
| `other` | أخرى |

No Settlement redesign. No Register redesign. No Reporting redesign. No new financial behavior. Historical Settlement Record totals are unchanged; only **display/aggregation mapping** unifies legacy brand codes (`mada`, `visa`, …) under `card`.

---

## 2. Canonical Catalog

**Source of truth:** `shared/operational-session/check/paymentMethod.ts`

| Symbol | Role |
|---|---|
| `CANONICAL_MONETARY_PAYMENT_METHODS` | `cash \| card \| other` — the catalog |
| `SELECTABLE_PAYMENT_METHODS` | `cash \| card` — UI settle selection (`other` hidden) |
| `LEGACY_CARD_PAYMENT_METHODS` | Historical brand codes accepted on read/write compat |
| `toCanonicalPaymentMethod()` | Display/analytics mapping (does not mutate SR) |
| `DEFAULT_PAID_PAYMENT_METHOD` | Remains `"other"` (omit-settlements path unchanged) |

**Labels:** `shared/reporting-platform/productSemantics.ts` → `PAYMENT_METHOD_LABELS` + `preferredPaymentMethodLabel()` (maps legacy → card label).

---

## 3. Adoption Surfaces

| Surface | Adoption |
|---|---|
| Register / Check Settlement Dialog | `listMonetaryPaymentMethodOptions` → selectable catalog |
| Counter Pickup Settlement | Reuses `MarkPaidSettlementDialog` |
| Waiter / Session / Table Settlement | Same settle dialog + router enums include `card` |
| Settlement Transactions / Records | Stored codes unchanged historically; labels via Product Semantics |
| Financial Shift tender summary | API display methods = canonical; Ops rows use `card` |
| Payment Analytics | Buckets aggregate by canonical key |
| Executive / PDF / Excel | Shared `buildPaymentMethodAnalysisViewModel` |
| Shift Closing / thermal / browser print | Same Ops tender presentation labels |
| Receipts (Settlement Record VM) | `preferredPaymentMethodLabel` |

---

## 4. Historical Mapping (display only)

| Stored code | Canonical display / analytics key |
|---|---|
| `cash` | `cash` → نقدًا |
| `card` | `card` → بطاقة (شبكة / بنك) |
| `mada`, `visa`, `mastercard`, `apple_pay`, `stc_pay`, `bank_transfer` | `card` |
| `other` | `other` → أخرى |
| `complimentary` | `complimentary` (hospitality; not a settle selection) |

Grand totals, mix denominators, Expected Cash, and Attribution cash tenders are **not** recalculated.

---

## 5. Files Touched (primary)

- `shared/operational-session/check/paymentMethod.ts` — catalog + mapping
- `shared/reporting-platform/productSemantics.ts` — canonical labels
- `client/src/lib/settlementPaymentMethodPresentation.ts` — selectable UI list
- `server/reporting-platform/PaymentMethodAnalyticsService.ts` — canonical buckets
- `client/src/lib/reporting-exports/paymentMethodAnalysisPresentation.ts`
- `server/crmp/api/crmpFinancialShiftTenderSummary.ts`
- `client/src/lib/register-operations-presentation/financialShiftTenderSummaryPresentation.ts`
- `client/src/lib/register-operations-presentation/registerOperationsCopy.ts`
- `server/routers.ts` — accept `card` (+ legacy compat)
- Architecture / unit tests updated for catalog unification

---

## 6. Explicit Non-Goals (honored)

- ✗ No Settlement pipeline redesign  
- ✗ No Register / Financial Shift ownership change  
- ✗ No Reporting KPI formula change  
- ✗ No gateway / brand-specific settle selection  
- ✗ No mutation of historical Settlement Record payment codes  

---

## 7. Verification

Covered by unit + architecture guards:

- Register / Mark Paid settle options = cash + card  
- Counter Pickup reuses same dialog  
- Session settle API accepts canonical + legacy  
- Shift closing Ops rows: نقدًا / بطاقة (شبكة / بنك)  
- Payment Analytics aggregates legacy brands into `card`  
- PDF / Excel / Dashboard share presentation VM  
- Historical `mada` labels resolve to بطاقة (شبكة / بنك)  
- Default omit-settlements path still records `other`  

---

## 8. Certification

**PAYMENT METHOD CATALOG — PRODUCTION UNIFIED**

One catalog. No duplicated payment lists for selection/display. No financial regression by design. Historical reports preserved via mapping.
