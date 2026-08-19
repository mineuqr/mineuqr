# PRODUCTION-VALIDATION-REPORT

**Program:** PAYMENT-CASHIER-DIRECT-FINANCIAL-COMMIT-PRODUCTION-VALIDATION-1  
**Date:** 2026-08-19  
**Repository HEAD:** `29db3a1056f6849f62627acc1ed2c5a6bdaacf5d`  
**ADR-038 body:** unchanged  
**Production-code mutation:** none

---

## Executive Decision

**CERTIFIED WITH CONDITIONS**

Not **PRODUCTION CERTIFIED**.

G1 (deploy identity) **PASS**. Mandatory Cashier financial gates G2–G8 and G11–G15 are **BLOCKED**: no authorized production Cashier session and no production database read. G9 and G10 are **NOT TESTABLE** in this session.

Fail-closed: missing production Confirm evidence is not treated as success.

---

## Gate Matrix

| Gate | Result | Evidence | Blocking? |
|---|---|---|---|
| G1 Production baseline | **PASS** | E1–E4. GitHub Production `5990799776` SHA `29db3a10` success. `www.mineuqr.com` HTML 200; JS `Last-Modified` 20:49:11Z; live bundle contains `showCardOverTender`. Schema not queried (E5); no new migration. | No |
| G2 Pre-Confirm Check absence | **BLOCKED** | No production `orderId` / pre-Confirm `checkId`. E6. | **Yes** |
| G3 Cash payment preview | **BLOCKED** | No production tender observation. Live bundle has `showCardOverTender` + `saleReady` (E4) but that is not a paint sample. | **Yes** |
| G4 Confirm financial commit | **BLOCKED** | No `pos.settlement.initiate` production trace. | **Yes** |
| G5 Financial record consistency | **BLOCKED** | No Check / ST / OS / SR rows. | **Yes** |
| G6 Printing | **BLOCKED** | No PAID→SR→print timeline. | **Yes** |
| G7 Confirm latency | **BLOCKED** | T0–T15 all UNKNOWN. | **Yes** |
| G8 Duplicate Confirm | **BLOCKED** | No production double-click / retry sample. | **Yes** |
| G9 Concurrent Confirm | **NOT TESTABLE** | No safe dual-Confirm harness against a production Order. | No (waived unless a harness exists) |
| G10 Failed Confirm | **NOT TESTABLE** | No safe production failure injection (would risk real financial rows). | No (waived unless a harness exists) |
| G11 Session / kiosk regression | **BLOCKED** | No post-deploy session/kiosk payment sample. | **Yes** |
| G12 Cashier preview regression | **BLOCKED** | Cases A–E not observed in production UI. Repository tests exist; they do not pass this gate. | **Yes** |
| G13 Realtime isolation | **BLOCKED** | Health shows realtime up (`connections=5`). No Confirm during `realtime_auth_failed`. Design isolation remains from prior forensics; not production Confirm proof. | **Yes** |
| G14 Observability | **BLOCKED** | No production `payment_confirm` / settlement logs pulled. Health probe only (E3). | **Yes** |
| G15 Tenant isolation | **BLOCKED** | No tenant-scoped financial row inspection. | **Yes** |
| G16 Certification | **FAIL** (upgrade denied) | Mandatory gates incomplete. | **Yes** |

---

## Financial Commit Timing

All timestamps **UNKNOWN** (G7 BLOCKED).

| Span | Value |
|---|---|
| Financial commit latency (T2–T8) | UNKNOWN |
| User-perceived Confirm (T0–T10) | UNKNOWN |
| Print latency (T12–T13) | UNKNOWN |
| Post-commit / modal release (T11–T15) | UNKNOWN |

The historical ~2.5s Confirm TX is **not** re-measured and is **not** treated as a defect. No `PAYMENT-FINANCIAL-COMMIT-PERFORMANCE-1` is opened.

---

## Duplicate / Retry Findings

Not observed in production (G8 BLOCKED).

Repository residual (implementation report, not re-tested here): membership uniqueness is not a DB constraint; different idempotency keys remain a residual duplicate-Check race.

---

## Failure Atomicity

Not observed in production (G10 NOT TESTABLE). No production failure was induced.

---

## Session/Kiosk Regression

Not observed in production (G11 BLOCKED). No evidence of regression was collected either.

---

## Cashier Preview Regression

Production paint of Cases A–E was not captured (G12 BLOCKED).

Supporting, non-passing evidence: live JS contains `showCardOverTender` and `saleReady` (E4). That proves the flicker-fix **bundle** is deployed, not that the cashier saw a truthful intermediate frame.

---

## Realtime Independence

`GET /api/realtime/health` → enabled, `connections=5` (E3).

No Cashier Confirm was executed during `realtime_auth_failed(expired)` or device `session_cookie_missing`. Those remain **separate** findings. They are not Cashier blockers by architecture; production independence is unproven (G13 BLOCKED).

---

## Tenant Isolation

No production financial rows were read (G15 BLOCKED). No cross-tenant evidence was collected.

---

## Known Remaining Risks (evidence-backed)

1. **Mandatory production Confirm sample still missing** — G2–G8, G11–G15 BLOCKED. This is the same class of condition as implementation Gate 16.
2. **Different-key membership race** — recorded in implementation report; not sampled here.
3. **Confirm wall-clock unknown** — may include materialize-in-TX work (I-PAY-24). Not classified as a defect without T2–T8.
4. **Realtime expired tickets** — independent of Cashier commit; not in this program.

---

## What this program did not do

- Did not create or pay a production Order
- Did not change ADR-038, Payment, Check, or Financial Commit code
- Did not lengthen ticket TTL, add retries, or mix realtime fixes
- Did not claim PRODUCTION CERTIFIED
