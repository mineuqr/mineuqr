# ARCHITECTURE-GUARD-EVIDENCE

Guards in `cashierDownstreamSettlementRecovery.architecture.guards.test.ts` now include Recovery-2:

- Confirm does not `await completeCashier…`
- Vercel cron path registered
- `CRON_SECRET` on the sweep HTTP
- POS initiate consults production CF by order
- UI `financiallyPaid` for OPEN Check
- journal has no 0098
- Session/Waiter/SettleOrder/Counter do not schedule cashier recovery
- Revenue Union `PRODUCTION_OVERLAP` unchanged

Forensic guards were updated so they describe the **fixed** invariants (OPEN+CF is paid; cron is the Production path), not the previous gap.
