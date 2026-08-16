# INVARIANTS

- I-POS-SETTLE-01 Settlement initiation is a POS command, not a POS financial aggregate.
- I-POS-SETTLE-02 Check Domain remains the sole settlement authority (`settleCheckPaidByIdDetailed`).
- I-POS-SETTLE-03 No POS Check / Settlement / Payment / Tender / Revenue table.
- I-POS-SETTLE-04 Requires PosAccessContext + `POS_ACCESS` + `SETTLEMENT_INITIATE`.
- I-POS-SETTLE-05 `POS_ACCESS` alone does not grant settlement initiation.
- I-POS-SETTLE-06 Owner / admin / PLATFORM_OWNER are not cashiers without explicit POS grants.
- I-POS-SETTLE-07 Restaurant, terminal, Order, and Check are server-authoritative.
- I-POS-SETTLE-08 Client totals, cashierId, channel, and restaurant ownership claims are ignored.
- I-POS-SETTLE-09 Order channel remains `cashier_pos`.
- I-POS-SETTLE-10 Register / Shift are not required.
- I-POS-SETTLE-11 No Reporting write, no ZATCA, no offline financial queue.
- I-POS-SETTLE-12 Idempotent retry cannot create a second financial mutation.
- I-POS-SETTLE-13 Terminal Check outcomes cannot regress through this command.
