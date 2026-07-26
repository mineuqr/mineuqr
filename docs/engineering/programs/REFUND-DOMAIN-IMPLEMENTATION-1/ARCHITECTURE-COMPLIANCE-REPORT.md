# REFUND-DOMAIN-IMPLEMENTATION-1 — Architecture Compliance Report

| Field | Value |
|---|---|
| **Program** | REFUND-DOMAIN-IMPLEMENTATION-1 |
| **Date** | 2026-07-26 |
| **ADR** | ADR-ARCH-032 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## 1. ADR-ARCH-032 compliance matrix

| Constitutional rule | Status | Evidence |
|---------------------|--------|----------|
| Refund Platform is FSP capability | **Met** | `shared/.../check/refund/` under Check |
| FSP owned by Check Aggregate | **Met** | `CheckService.applyRefundOnCheck` + `withCheckOwnedTransaction` |
| Settlement Ledger entry ≠ authority | **Met** | No Ledger money module; Check decides |
| Check sole monetary authority | **Met** | No Order/Session/Register apply path |
| Settlement Record immutable | **Met** | `createCompensatingSettlementRecord` only; `forbidSettlementRecordMutation` |
| Compensating SR `recordKind=refund` | **Met** | `publishCompensatingSettlementRecord` |
| `priorSettlementRecordId` mandatory | **Met** | Domain + SR-INV compensating assert |
| Register custody only | **Met** | No CRMP attribution in this program |
| Reporting consumes publications | **Met** | No Reporting writes |

---

## 2. Related ADR compliance

| ADR | Status | Notes |
|-----|--------|-------|
| ADR-ARCH-020 | **Met** | No second monetary Aggregate / ERP ledger |
| ADR-ARCH-021 | **Met** | `applied` \| `already_applied`; claim keys; generation uniqueness |
| ADR-ARCH-022 | **Met** | OS `settled\|complimentary → refunded`; I-OS-14 preserved |
| ADR-ARCH-023 | **Met** | I-FC-05 allocation ≤ refund ≤ budget |
| ADR-ARCH-026 | **Met** | Append-only compensating publication |
| ADR-ARCH-028 / 030 | **Met** | Register not implemented here (custody deferred) |
| ADR-ARCH-031 | **Met** | No purge path introduced |

---

## 3. Fitness rules (RF-FIT)

| Rule | Status |
|------|--------|
| RF-FIT-01 No second Financial SSOT | **Pass** |
| RF-FIT-02 No SR mutation | **Pass** |
| RF-FIT-03 No Refund outside FSP | **Pass** |
| RF-FIT-04 No Refund from Order | **Pass** |
| RF-FIT-05 No Refund from Session | **Pass** |
| RF-FIT-06 No Refund from Register | **Pass** |
| RF-FIT-07 No Aggregate violation | **Pass** |
| RF-FIT-08 No lifecycle reopening | **Pass** |
| RF-FIT-09 No Refund before settlement | **Pass** |
| RF-FIT-10 No parallel budget SSOT | **Pass** |
| RF-FIT-11 No Reporting invented nets | **Pass** (N/A — not implemented) |
| RF-FIT-12 No Settlement Ledger authority creep | **Pass** |
| RF-FIT-13 ADR-021 idempotency | **Pass** |
| RF-FIT-14 No purge of refund SR | **Pass** (no purge code) |

---

## 4. Ownership matrix (runtime)

| Concern | Owner in code |
|---------|---------------|
| Refund apply | Check Aggregate |
| Refundable budget | `calculateRefundBudget` under Check |
| Compensating publication | Check → Settlement Record insert |
| OS terminal `refunded` | Check → `refundOrderSettlement` |
| Custody / Attribution | **Not in this program** |
| Reporting nets | **Not in this program** |

---

## 5. Architectural deviations

**NONE.**

No undocumented architectural decisions were made. Implementation follows ADR-ARCH-032 Alternative A exclusively.

---

## 6. Final Certification

**PRODUCTION CERTIFIED**
