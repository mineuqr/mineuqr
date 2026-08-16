# INVARIANTS

- I-POS-SALE-01 Every direct POS Sale creates/uses a canonical Order.
- I-POS-SALE-02 POS MUST NOT create a parallel Order aggregate.
- I-POS-SALE-03 Direct POS Sale MUST use `cashier_pos`.
- I-POS-SALE-04 Existing non-POS Order channels MUST NOT be rewritten by POS.
- I-POS-SALE-05 POS Sale MUST require valid PosAccessContext.
- I-POS-SALE-06 POS Sale MUST require `SALE_CREATE` (and `POS_ACCESS`).
- I-POS-SALE-07 Terminal identity MUST remain attributable to the originating POS Terminal.
- I-POS-SALE-08 Cashier identity MUST be derived server-side.
- I-POS-SALE-09 Restaurant scope MUST be derived/validated server-side.
- I-POS-SALE-10 POS Sale MUST NOT create Settlement.
- I-POS-SALE-11 POS Sale MUST NOT mark a Check paid.
- I-POS-SALE-12 POS Sale MUST NOT create Revenue.
- I-POS-SALE-13 POS Sale MUST be idempotent for the same key + fingerprint.
- I-POS-SALE-14 POS Sale MUST NOT trust client-supplied financial totals.
- I-POS-SALE-15 POS Sale MUST NOT create a POS Session.
- I-POS-SALE-16 POS Sale MUST NOT create a POS Check.
- I-POS-SALE-17 POS Sale MUST NOT create POS Register/Shift.
- I-POS-SALE-18 Historical POS Order attribution MUST NOT be rewritten.
