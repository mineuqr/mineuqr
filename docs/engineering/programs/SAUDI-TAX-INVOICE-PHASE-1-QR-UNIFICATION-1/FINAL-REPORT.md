# SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1 — Final Report

## Verdict: **PASS WITH OPEN QUESTIONS**

Open questions unchanged (OQ-CLASS-1, OQ-SELLER-1, OQ-VAT-1, OQ-B2G, OQ-EDU-HEALTH, date-of-supply).

## Policy

| Kind | Previous | New (MineuQR product policy) |
|------|----------|------------------------------|
| Simplified Tax Invoice | QR | QR |
| Standard Tax Invoice | no QR | QR |

- Regulatory minimum: Simplified requires QR.
- Product policy: `SAUDI_PHASE_1_QR_POLICY = ALWAYS_FOR_TAX_INVOICES`.
- **Not** a claim that ZATCA Phase 1 legally mandates Standard QR.

## Implementation

- Single path: `saudiPhase1QrRequired` → `buildSaudiPhase1QrPayloadBase64` (TLV 1–5) → persist → Cashier/HTML render.
- Existing Phase 1 QR format reused. No second encoder. Cashier does not generate QR.
- No migration (existing `qrPayloadBase64` / Phase 1 document fields).
- Already-persisted Standard documents without QR remain immutable (no silent rewrite).

## Scope certification

- QR is now present on Simplified Tax Invoice (unchanged).
- QR is now present on Standard Tax Invoice (new).
- Existing Phase 1 QR format/path was reused.
- No Phase 2 / Fatoora / CSID / signing / hash chain.
- No financial / Collection Fact / PAID / payment / settlement change.
- No Customer Core change.
- No VAT engine.
- No new migration.

## Verification

| Gate | Result |
|------|--------|
| Focused QR + Tax Invoice + Cashier tests | PASS (51) |
| `pnpm run check` | PASS |
| `pnpm run db:governance-check` | PASS (terminus 0108 / 109) |
| `git diff --check` | PASS (after ADR whitespace fix) |
| Migration | none |
| Live browser View/Print Preview | **LIVE BROWSER VERIFICATION NOT RUN IN-AGENT** |
| Vercel deployment | verify after push |

## Commit / remote

- Feature: `c7a2d2cf` — `feat(tax): unify Saudi phase 1 tax invoice QR`
- Docs: `6c95736b` — `docs(tax): record Saudi phase 1 QR unification SHA`
- `HEAD == origin/main` (`6c95736b`)
- Working tree clean after push
- Live browser View/Print: **NOT RUN IN-AGENT**
- Vercel: verify in dashboard if deployment auto-triggers from main
