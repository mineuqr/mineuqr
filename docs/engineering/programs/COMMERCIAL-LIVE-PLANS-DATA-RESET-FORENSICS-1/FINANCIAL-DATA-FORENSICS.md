# FINANCIAL-DATA-FORENSICS.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1  
**Do not delete any of these rows.**

---

## 1. Invoices (`invoices`) — commercial SaaS billing documents

| ID | User | Sub | Amount | Currency | Status | paidAt | PDF |
|----|------|-----|--------|----------|--------|--------|-----|
| 930001 | 1 | 600001 | 19.00 | USD | pending | null | yes |
| 960001 | 1 | 600001 | 19.00 | USD | pending | null | yes |
| 990001 | 14760004 | 690001 | 39.00 | USD | pending | null | yes |
| 1020001 | 14760004 | 690001 | 39.00 | USD | pending | null | yes |
| 1050001 | 14760004 | 750001 | 39.00 | USD | pending | null | yes |
| 1080001 | 21630002 | 780001 | 899.00 | USD | pending | null | yes |
| 1110001 | 21630002 | 780001 | 899.00 | USD | pending | null | yes |

- Paid invoices: **0**
- Sum of pending: **1953.00 USD**
- No catalog version / snapshot ID on invoices
- Amounts match **legacy** `subscription_plans` list prices (19 / 39 / 899), not catalog SAR 99/299

**Class:** generated billing documents for owner/internal/test accounts. **Not customer AR.** Still **immutable financial facts** — retain.

---

## 2. Payments (`payments`) — Tap charges

| ID | User | Sub | Amount | Status | paidAt | Failure |
|----|------|-----|--------|--------|--------|---------|
| 1 | 1 | 30001 *(not a current sub id)* | 175 SAR | declined | null | Auth failed 516 |
| 2 | 1 | 30001 | 175 SAR | declined | null | Auth failed 516 |
| 3 | 1 | 30001 | 175 SAR | declined | null | Auth failed 516 |
| 30001 | **2700049** (user missing) | null | 349 SAR | declined | null | Auth failed 516 |
| **60001** | **2700049** (user missing) | null | **349 SAR** | **captured** | 2026-05-19 | code 000 |

Charge / customer ID prefixes: `chg_TS*`, `cus_TS*` (Tap test/sandbox style). All five rows are **2026-05-19**.

**Class:**

- Rows 1–3: owner **C. payment-gateway tests** (declined)
- Row 30001: **E. orphan declined**
- Row 60001: **E. orphan captured charge** for a user/subscription that no longer exist

This captured row is a **financial fact that must be retained**. It is **not** attached to any current subscriber, invoice, or commercial catalog version. It does **not** prove a live paying customer.

---

## 3. Subscription history

Two rows, both `action=activated`, user `2700049`, subscription `240001`, plan `30002`, 349 SAR yearly, period 2026-05-19 → 2027-05-19, notes `Payment via Tap - activated`.

Neither `users.id=2700049` nor `user_subscriptions.id=240001` exist today.

**Class: E. Orphaned gateway-activation log.** Retain. No catalog FK.

---

## 4. Restaurant settlement (not SaaS billing)

| Table | Rows | Meaning |
|-------|------|---------|
| `settlement_records` | 39 | Restaurant check settlement |
| `check_settlement_transactions` | 35 | Same operational domain |
| Check-split payment tables | 0 | |

These are **order/settlement platform facts** for the owner’s restaurant (42 orders). They are **not** commercial subscription billing. **Retain. Out of scope for catalog reset.**

---

## 5. Answer

| Question | Answer |
|----------|--------|
| Real customer billing facts (paid SaaS invoices)? | **No** |
| Real captured gateway money that must be kept as a record? | **Yes — one orphaned 349 SAR captured Tap row** |
| May invoices / payments / history be deleted in a catalog reset? | **No** |
| Do they depend on version/snapshot tables? | **No** |
