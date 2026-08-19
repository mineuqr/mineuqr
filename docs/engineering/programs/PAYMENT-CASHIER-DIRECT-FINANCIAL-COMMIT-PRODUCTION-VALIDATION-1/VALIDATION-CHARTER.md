# PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-PRODUCTION-VALIDATION-1 — Validation Charter

| Field | Value |
|---|---|
| **Program ID** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-PRODUCTION-VALIDATION-1 |
| **Kind** | Production validation (no production-code mutation) |
| **Governing ADR** | [ADR-ARCH-038](../../../architecture/adrs/ADR-ARCH-038-cashier-direct-financial-commit.md) — Accepted (governance) |
| **Predecessors** | PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-IMPLEMENTATION-1 · CASHIER-PAYMENT-TRANSIENT-STATE-FIX-1 |
| **Repository HEAD at charter** | `29db3a1056f6849f62627acc1ed2c5a6bdaacf5d` |
| **Date** | 2026-08-19 |
| **Commercial Capability Impact** | **NO** — no Pricing, Plan Editor, or `requireFeature` change |

This charter does **not** certify production. Certification is recorded only in `CERTIFICATION-DECISION.md` after gate evidence.

---

## 1. Objective

Prove in production that Cashier Direct Financial Commit is:

correct, atomic, idempotent, channel-isolated, observable, operationally safe, and production-ready.

Do **not** ask only whether the happy path works.

---

## 2. Intended production baseline

| Layer | Expected |
|---|---|
| Implementation report | `8f850ea0` — CERTIFIED WITH CONDITIONS |
| Transient preview fix | `29db3a10` — `fix(cashier): remove payment readiness display flicker` |
| Schema | No new migration. Last journal tag remains `0095_check_charges` |
| ADR-038 | Unchanged |

Intended live SHA: **`29db3a10`** (contains ADR-038 runtime + preview/Confirm split).

---

## 3. Scope

In:

- Production deploy identity (G1)
- Controlled Cashier Confirm without a pre-existing Check (G2–G7)
- Duplicate / concurrent / failed Confirm (G8–G10) where safely testable
- Session/kiosk isolation (G11)
- Preview vs Confirm readiness (G12)
- Realtime independence (G13)
- Observability and tenant isolation (G14–G15)
- Certification decision (G16)

Out:

- Production application-code changes
- ADR-038 edits
- Async financial commit
- PaymentEngine / `payments` table
- Confirm TX optimization
- Realtime ticket-lifecycle fix
- Device `session_cookie_missing` observability correction

---

## 4. Authority

- Browser: preview only
- Server: sole financial authority (`computeCheckMoney`, Confirm, Check, ST, OS, SR)
- Print / ops: after PAID + Settlement Record
- Realtime: not on the Cashier Confirm critical path

---

## 5. Stop conditions

STOP and remain **CERTIFIED WITH CONDITIONS** or **NOT CERTIFIED** if:

- Production is not running the intended SHA
- A pre-payment OPEN Check is still required for Cashier Confirm
- Duplicate financial facts appear
- Failed Confirm leaves an orphan OPEN Check
- Session/kiosk Check contract regresses
- Evidence is missing for a mandatory gate

Do not silently patch production during this program.

---

## 6. Evidence standard

Each gate is **PASS**, **FAIL**, **BLOCKED**, or **NOT TESTABLE**.

PASS requires production evidence named in `EVIDENCE-INDEX.md`. Repository tests may support a gate; they do not pass a production gate by themselves.
