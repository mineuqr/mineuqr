# SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1 — Final Report

## Verdict: **PASS WITH OPEN QUESTIONS**

## Deliverables

| Artifact | Path |
|----------|------|
| Evaluation | `docs/architecture/evaluations/SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1.md` |
| ADR | `docs/architecture/adrs/ADR-ARCH-041-saudi-tax-invoice-boundary.md` |
| Future contracts | `docs/architecture/contracts/saudi-tax-invoice-future-contracts.md` |
| Guards | `server/compliance/__tests__/saudiTaxInvoiceArchitecture.evaluation.guards.test.ts` |
| Registry | ADR-ARCH-041 entry in `ADR-Registry.md` |

## Architecture Decision (summary)

Tax Invoice is a **Saudi Compliance artifact** issued **after** Collection Fact / PAID via existing orchestration. Customer ≠ invoice type. Missing buyer tax number ≠ non-tax invoice. Classification is a dedicated Saudi-owned decision. Snapshots freeze seller/buyer/lines. PAID remains independent of compliance success.

## Financial Boundary

Unchanged. Collection Fact remains financial authority. No CF / PAID / PaymentConfirm changes.

## Compliance Boundary

`countryCode` → module; Tax Invoice behind Saudi module; post-CF hook retained; harden durable delivery in a future program (G1).

## Customer Boundary

Buyer identity only; no SA branching; no invoice-type ownership.

## Tax Profile Boundary

Seller snapshot source; readiness gate; no new profile fields in this program.

## Invoice Classification / B2B/B2C / Simplified/Standard

Saudi-owned `InvoiceClassification`; not `taxNumber ? B2B : B2C`.

## Deferred / Needs confirmation

See evaluation §§13–14 (Phase 2 UX, VAT SSOT, seller not_registered, Individual defaults, B2G, education/health specials).

## Next Program

1. Persist `customerId` on sale (G2)  
2. **SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1** (persistence + classification + snapshots; no ZATCA API)

## Scope certification

- NO TAX INVOICE IMPLEMENTATION WAS PERFORMED.
- NO MIGRATION WAS CREATED.
- NO CUSTOMER SCHEMA WAS CHANGED.
- NO ZATCA / IRN / QR / VAT ENGINE WAS IMPLEMENTED.

## Verification

| Check | Result |
|-------|--------|
| Evaluation architecture guards | **PASS** (16) |
| `pnpm run check` | **PASS** |
| `git diff --check` | **PASS** |
| Migration | **unchanged** — no 0106 |

## SHAs

| Field | Value |
|-------|-------|
| Starting SHA | `ca351d20` |
| Ending SHA | *(after push)* |
| Commit | `docs(architecture): evaluate Saudi tax invoice architecture` |
