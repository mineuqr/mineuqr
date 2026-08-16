# CONCURRENCY / IDEMPOTENCY FORENSICS

## Optimistic concurrency (actual)

| Entity | Version / CAS | Path |
|--------|---------------|------|
| Check header `operational_checks` | **No `version` column** | Outcome/totals updated without header CAS |
| Split Payment | `version` + `expectedVersion` | `checkSplitPaymentIntegration.ts` |
| Multi-Check Allocation | `version` CAS | `checkMultiCheckAllocationIntegration.ts` |
| CRMP Register / Shift | `version` | `crmp_registers`, `crmp_financial_shifts` |
| Order root | ADR-ARCH-011 planned; **not** a Check substitute | ADR-ARCH-011 |

Approved POS Check concurrency (expected vs actual version) is **not fully present on the Check header**. Child financial operations already use OCC.

**Classification:** GAP (E — future settlement/POS-check phase), not a Phase 1 blocker. Phase 1 must **define the contract**: Check mutations later MUST use Check-owned OCC; do **not** invent a POS-local concurrency bus. If header version is required, that is a **Check platform** follow-up, not a POS table.

## Idempotency

ADR-ARCH-021 (event/business idempotency) + ADR-ARCH-014 (transport ledger). Settlement Record append-only. PlaceOrder / settle have existing duplicate-protection patterns in Check/Settlement tests.

POS must **reuse** those mechanisms for later sale/settle. Do not add a generic POS idempotency layer that duplicates Event/Settlement claims.

Terminal lifecycle (register/activate) should be naturally idempotent (unique restaurant+code; no-op if already active).
