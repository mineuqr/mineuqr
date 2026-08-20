# CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2

**IMPLEMENTED · VALIDATED · NOT YET PRODUCTION ACTIVATED**

NO SCHEMA CHANGE. NO MIGRATION 0098. NO SECOND FINANCIAL AUTHORITY. NO PRODUCTION DATA WRITES. NO DEPLOYMENT. NO PRODUCTION CERTIFICATION.

This commit is the Recovery-2 **implementation baseline**. Production Cron/`CRON_SECRET` activation is a separate program (`PRODUCTION-CASHIER-RECOVERY-ACTIVATION-1`) and remains **BLOCKED** until this commit is on a clean tree, `CRON_SECRET` is set, and Cron execution is observed.

## What this program did

1. Treat committed Production Collection Fact as **financially PAID** even when Check is still OPEN (Cashier unknown-result recovery + `pos.read.check.getByOrder`).
2. Block a second Cashier Collection Fact for the same order (POS initiate replays the existing fact).
3. List cashier_pos operationally when a production Collection Fact exists (kitchen/expo can see the sale before Check PAID).
4. Stop blocking the success toast on `settlementRecord.getByCheck`.
5. Add a **durable** Vercel Cron HTTP sweep over existing CF + Check + ST/OS/SR rows. Best-effort `waitUntil` is not the source of correctness.

## Classification

| Criterion | Result |
|---|---|
| Confirm still bounded by Collection Fact | **PASS** (source) |
| HTTP does not await ST/OS/SR | **PASS** (source + unit) |
| OPEN Check does not mean unpaid when CF exists | **PASS** (source + unit) |
| Second pay of same order | **PASS** (POS initiate replay) |
| Durable discoverability | **PASS** (existing derived obligation + cron route) |
| Production/Vercel path in source | **PASS** (`vercel.json` cron + `createApiApp` route) |
| Cron actually configured in the Vercel dashboard / `CRON_SECRET` set | **UNKNOWN** until deploy + env |
| waitUntil available in the Production Node runtime | **UNKNOWN** (best-effort only) |

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [RECOVERY-STATE-MODEL.md](./RECOVERY-STATE-MODEL.md)
- [PRODUCTION-RUNTIME-VERCEL.md](./PRODUCTION-RUNTIME-VERCEL.md)
- [FAILURE-RETRY-MATRIX.md](./FAILURE-RETRY-MATRIX.md)
- [DEPENDENCY-RECONCILIATION.md](./DEPENDENCY-RECONCILIATION.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [TEST-EVIDENCE.md](./TEST-EVIDENCE.md)
- [ARCHITECTURE-GUARD-EVIDENCE.md](./ARCHITECTURE-GUARD-EVIDENCE.md)
- [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md)
