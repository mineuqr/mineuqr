# CHECK-SETTLEMENT-METHODS-1 — Settlement Architecture

## Purpose

Evolve Check Management into a financial settlement platform that supports multiple payment methods and split tenders **without** payment gateway integration and **without** changing Revenue ownership.

## Aggregate model (decision)

```
Operational Session
  └── Check  (aggregate root — monetary SSOT)
        └── SettlementTransaction[]  (tender lines)
```

| Question | Decision | Evidence |
|----------|----------|----------|
| State-only vs transactions? | **Check → Settlement State + Transactions** | Prior architecture forbade tender lines; multi-method / split requires child lines. Check `outcome` + `grandTotal` remain terminal SSOT. |
| Split Check (seats)? | Still out of scope | CHECK-MANAGEMENT non-goal preserved |
| Gateways? | Out of scope | No PSP SDKs |

## Ownership

| Concern | Owner |
|---------|--------|
| Check outcome / grandTotal / freeze | Check Management |
| Settlement transactions | Check Management (child of Check) |
| Payment method catalog | Check Management (`paymentMethod.ts`) |
| Revenue / Tax / Paid Checks KPIs | Reporting Platform (unchanged formulas) |
| Future tender analytics | Reporting Platform read adapter (not mounted yet) |

## Payment methods

Canonical codes: `cash`, `mada`, `visa`, `mastercard`, `apple_pay`, `stc_pay`, `bank_transfer`, `complimentary`, `other`.

Extensibility: `paymentMethod` is `varchar(32)` — new codes do not require schema redesign.

Categories (reporting rollup): cash · card · digital_wallet · bank · complimentary · other.

## Settlement transaction

Fields: id, checkId, restaurantId, sessionId, paymentMethod, amount, currencyCode, status (`captured|pending|voided|refunded`), businessTimestamp, reference, externalReference, notes, audit timestamps.

## Split payment (implemented scope)

Atomic paid settle may include **1..N** tender lines whose amounts **sum to Check.grandTotal**.

- Partial settle while Check stays `open`: **designed** (`isCheckFullyCoveredBySettlements`) but **not productized** — current settle remains atomic.
- Partial refunds: status `refunded` reserved; no refund flow in this program.
- Default `markPaid` (no tender UI): one captured line with method `other` for full grandTotal.

## Financial invariants

1. Revenue = `SUM(paid Check.grandTotal)` — never sum of tender lines as Revenue KPI.
2. Paid settle tenders must not use `complimentary`.
3. Complimentary settle writes one `complimentary` tender for grandTotal.
4. Voided Checks write **no** settlement transactions.
5. Tenant isolation via `restaurantId` on every row.

## Reporting relationship

| Existing KPI | Source | Changed? |
|--------------|--------|----------|
| Check Revenue | paid Check.grandTotal | **No** |
| Tax / Paid Checks / Average Check | Check summary | **No** |
| Future Revenue by method | `settlementTransactionReportingAdapter` | Ready, API not mounted |

## Extension rules

1. Add payment methods to `PAYMENT_METHODS` (and docs); persist as code string.
2. Split UI/API may pass `settlements` into `settleCheckPaid` — do not bypass Check finalize.
3. Gateway captures set `externalReference` + status; still finalize through Check.
4. Never move settlement into Order Domain.
5. Never redefine Revenue as tender sum.
