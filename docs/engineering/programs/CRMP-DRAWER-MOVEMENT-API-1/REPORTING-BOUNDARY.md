# REPORTING BOUNDARY

Drawer movements already affect `computeExpectedCash`, which Shift views, close, archive, and closing report already expose as `expectedCashAmount`.

Tender summary remains Settlement-attribution based and **does not** read drawer movements (certified FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1).

This program:

- does not create POS reporting tables
- does not add a movement list reporting pipeline
- does not change Revenue

If a dedicated cash-movement report is needed later, that is a Reporting program consuming CRMP facts — not a POS ledger.
